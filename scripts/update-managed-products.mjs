#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const manifestPath = path.join(cwd, "tap-manifest.json");
const contractLockPath = path.join(cwd, "buildchain.contract-lock.json");
const supportedPlatforms = new Set(["darwin-arm64", "linux-x64"]);
const kfdKeys = ["kfd-1", "kfd-2", "kfd-3"];

function usage() {
  return `Usage:
  node scripts/update-managed-products.mjs [--package <name>|--all] [--release-passport <url>] [--write] [--check] [--update-lock] [--json]

Defaults to a dry-run drift report for all managed tap entries.

Options:
  --package <name>          Update/check one managed formula entry.
  --all                     Update/check all managed formula entries. This is the default.
  --release-passport <url>  Override the upstream release passport for --package.
  --write                   Write formula and tap-manifest projections.
  --check                   Exit non-zero when an update would be written.
  --update-lock             Also refresh buildchain.contract-lock.json from Buildchain @v2 when compatible.
  --json                    Print machine-readable JSON.
`;
}

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : fallback;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`);
}

function optionalString(value) {
  return value === undefined || value === null ? "" : String(value);
}

function nonEmptyString(value, label) {
  const normalized = optionalString(value).trim();
  if (!normalized) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return normalized;
}

function digestWithoutPrefix(value) {
  return optionalString(value).replace(/^sha256:/, "");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeRepository(value = "") {
  const raw = optionalString(value).trim();
  if (!raw) return "";
  const githubMatch = raw.match(/github\.com[:/]([^/\s]+\/[^/\s#]+?)(?:\.git)?(?:[#/?].*)?$/);
  if (githubMatch) return githubMatch[1].replace(/\.git$/, "");
  if (/^[^/\s]+\/[^/\s]+$/.test(raw)) return raw.replace(/\.git$/, "");
  return raw;
}

function inferPlatformFromName(name) {
  const lower = optionalString(name).toLowerCase();
  if (lower.includes("apple-darwin") || lower.includes("darwin") || lower.includes("macos")) {
    return lower.includes("aarch64") || lower.includes("arm64") ? "darwin-arm64" : "darwin-x64";
  }
  if (lower.includes("windows") || lower.includes("pc-windows") || lower.endsWith(".zip")) {
    return "windows-x64";
  }
  if (lower.includes("linux") || lower.includes("unknown-linux")) {
    return lower.includes("aarch64") || lower.includes("arm64") ? "linux-arm64" : "linux-x64";
  }
  return "";
}

function githubAssetUrl(repository, tag, name) {
  const repo = normalizeRepository(repository);
  if (!repo || !tag || !name) return "";
  return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`;
}

function canonicalPassportUrl(repository, tag) {
  return githubAssetUrl(repository, tag, "buildchain.release.json");
}

function formulaClassName(name) {
  return nonEmptyString(name, "package name")
    .replace(/^@[^/]+\//, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function rubyString(value) {
  return optionalString(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "kungfu-systems-homebrew-tap-updater",
        },
      });
      if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

function runGit(args, options = {}) {
  const result = childProcess.spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout.trim();
}

function lsRemoteSha(repository, ref) {
  const repo = normalizeRepository(repository);
  const output = runGit(["ls-remote", `https://github.com/${repo}.git`, `refs/tags/${ref}`, `refs/heads/${ref}`]);
  const first = output.split(/\r?\n/).find(Boolean);
  if (!first) {
    throw new Error(`could not resolve ${repo}@${ref}`);
  }
  return first.split(/\s+/)[0];
}

function normalizeArtifact(artifact, { repository, tag } = {}) {
  const name = nonEmptyString(artifact.name || artifact.filename, "artifact.name");
  const platform = optionalString(artifact.platform || inferPlatformFromName(name));
  return {
    name,
    platform,
    url: optionalString(artifact.url || artifact.browser_download_url || artifact.downloadUrl)
      || githubAssetUrl(repository, tag, name),
    sha256: digestWithoutPrefix(artifact.sha256 || artifact.digest || artifact.checksum),
  };
}

function formulaArchiveArtifacts(passport, context) {
  return (passport.artifacts || [])
    .map((artifact) => normalizeArtifact(artifact, context))
    .filter((artifact) => supportedPlatforms.has(artifact.platform))
    .filter((artifact) => /\.(?:tar\.gz|tgz)$/i.test(artifact.name))
    .sort((left, right) => left.platform.localeCompare(right.platform));
}

function renderFormula({ entry, passport, artifacts, repository }) {
  const packageName = entry.name;
  const formulaClass = formulaClassName(packageName);
  const darwinArm64 = artifacts.find((artifact) => artifact.platform === "darwin-arm64");
  const linuxX64 = artifacts.find((artifact) => artifact.platform === "linux-x64");
  if (!darwinArm64 || !linuxX64) {
    throw new Error(`${packageName} formula requires darwin-arm64 and linux-x64 tar.gz artifacts`);
  }
  const desc = optionalString(entry.formula?.desc || "Release passport and build evidence toolkit");
  const homepage = optionalString(entry.formula?.homepage || passport.product?.homepage || "https://buildchain.libkungfu.dev");
  const license = optionalString(entry.formula?.license || "Apache-2.0");
  const version = nonEmptyString(passport.release?.publishedVersion || passport.release?.versionLabel, "release.publishedVersion");
  return `class ${formulaClass} < Formula
  desc "${rubyString(desc)}"
  homepage "${rubyString(homepage)}"
  version "${rubyString(version)}"
  license "${rubyString(license)}"

  if OS.mac? && Hardware::CPU.arm?
    url "${rubyString(darwinArm64.url)}"
    sha256 "${rubyString(darwinArm64.sha256)}"
  elsif OS.linux? && Hardware::CPU.intel?
    url "${rubyString(linuxX64.url)}"
    sha256 "${rubyString(linuxX64.sha256)}"
  else
    odie "${formulaClass} Homebrew formula currently supports macOS arm64 and Linux x86_64 binary archives."
  end

  def install
    bin.install "${rubyString(packageName)}"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/${rubyString(packageName)} version")
  end
end
`;
}

function kfdProjection(passport) {
  return Object.fromEntries(kfdKeys.map((key) => {
    const status = passport[key]?.status;
    if (status !== "passed") {
      throw new Error(`${key} status must be passed in upstream release passport; got ${status || "(missing)"}`);
    }
    return [key, "passed"];
  }));
}

async function projectEntry({ manifest, entry, releasePassportOverride = "" }) {
  const currentLocation = releasePassportOverride
    || entry.upstream?.latestReleasePassportUrl
    || entry.upstream?.releasePassportUrl;
  const passportLocation = nonEmptyString(currentLocation, `${entry.name} release passport`);
  const passport = await fetchJson(passportLocation);
  const repository = normalizeRepository(entry.upstream?.repository || passport.product?.repository);
  const tag = nonEmptyString(passport.release?.tag, "release.tag");
  const version = nonEmptyString(passport.release?.publishedVersion || passport.release?.versionLabel, "release.publishedVersion");
  const releasePassportUrl = canonicalPassportUrl(repository, tag);
  const artifacts = formulaArchiveArtifacts(passport, { repository, tag });
  const kfd = kfdProjection(passport);
  const updatedEntry = {
    ...entry,
    upstream: {
      ...entry.upstream,
      repository,
      tag,
      releasePassportUrl,
      latestReleasePassportUrl: entry.upstream?.latestReleasePassportUrl
        || `https://github.com/${repository}/releases/latest/download/buildchain.release.json`,
    },
    version,
    kfd,
    artifacts: artifacts.map((artifact) => ({
      platform: artifact.platform,
      url: artifact.url,
      sha256: artifact.sha256,
    })),
  };
  const formula = renderFormula({ entry: updatedEntry, passport, artifacts, repository });
  const currentFormulaPath = path.join(cwd, updatedEntry.path);
  const currentFormula = fs.existsSync(currentFormulaPath) ? fs.readFileSync(currentFormulaPath, "utf8") : "";
  const formulaChanged = currentFormula !== formula;
  const existingEntry = (manifest.entries || []).find((candidate) => candidate.name === entry.name && candidate.type === entry.type);
  const manifestEntryChanged = JSON.stringify(existingEntry, null, 2) !== JSON.stringify(updatedEntry, null, 2);
  return {
    package: entry.name,
    repository,
    tag,
    version,
    releasePassportUrl,
    formulaPath: updatedEntry.path,
    formula,
    updatedEntry,
    changed: formulaChanged || manifestEntryChanged,
    changes: {
      formula: formulaChanged,
      manifestEntry: manifestEntryChanged,
    },
    artifacts: updatedEntry.artifacts,
  };
}

async function updateContractLock({ write = false, buildchainRepository = "kungfu-systems/buildchain", buildchainRef = "v2" } = {}) {
  const contractUrl = `https://raw.githubusercontent.com/${normalizeRepository(buildchainRepository)}/${encodeURIComponent(buildchainRef)}/dist/site/buildchain-contract.json`;
  const currentContract = await fetchJson(contractUrl);
  const currentSha = lsRemoteSha(buildchainRepository, buildchainRef);
  const lock = readJson(contractLockPath);
  if (lock.contract !== "kungfu-buildchain-contract-lock") {
    throw new Error("buildchain.contract-lock.json must be a Buildchain contract lock");
  }
  const accepted = lock.buildchain || {};
  const compatibilityPolicy = accepted.compatibilityPolicy || "major-compatible";
  if (compatibilityPolicy === "major-compatible" && accepted.compatibilityDigest !== currentContract.compatibilityDigest) {
    throw new Error(`Buildchain ${buildchainRef} has breaking contract drift: ${accepted.compatibilityDigest} -> ${currentContract.compatibilityDigest}`);
  }
  const nextBuildchain = {
    ref: buildchainRef,
    resolvedSha: currentSha,
    contract: currentContract.contract,
    contractDigest: currentContract.contractDigest,
    compatibilityDigest: currentContract.compatibilityDigest,
    majorLine: currentContract.majorLine || buildchainRef,
    compatibilityPolicy,
    surfaces: (currentContract.surfaces || []).map((surface) => ({
      id: surface.id,
      kind: surface.kind,
      breakingDigest: surface.breakingDigest,
    })),
  };
  const acceptedComparable = { ...accepted };
  delete acceptedComparable.acceptedAt;
  const materialChanged = JSON.stringify(acceptedComparable) !== JSON.stringify(nextBuildchain);
  const nextLock = {
    schemaVersion: 1,
    contract: "kungfu-buildchain-contract-lock",
    buildchain: {
      ...nextBuildchain,
      acceptedAt: materialChanged ? new Date().toISOString() : accepted.acceptedAt || new Date().toISOString(),
    },
  };
  const currentText = `${JSON.stringify(lock, null, 2)}\n`;
  const nextText = `${JSON.stringify(nextLock, null, 2)}\n`;
  const changed = currentText !== nextText;
  if (write && changed) {
    writeJson(contractLockPath, nextLock);
  }
  return {
    changed,
    compatible: true,
    buildchainRef,
    previousSha: accepted.resolvedSha || "",
    resolvedSha: currentSha,
    previousContractDigest: accepted.contractDigest || "",
    contractDigest: currentContract.contractDigest,
    compatibilityDigest: currentContract.compatibilityDigest,
    surfaceCount: nextLock.buildchain.surfaces.length,
    written: write && changed,
  };
}

async function main(argv = process.argv.slice(2)) {
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    process.stdout.write(usage());
    return;
  }
  const write = hasFlag(argv, "--write");
  const check = hasFlag(argv, "--check");
  const json = hasFlag(argv, "--json");
  const packageName = argValue(argv, "--package", "");
  const releasePassport = argValue(argv, "--release-passport", "");
  const updateLock = hasFlag(argv, "--update-lock");
  if (releasePassport && !packageName) {
    throw new Error("--release-passport requires --package <name>");
  }

  const manifest = readJson(manifestPath);
  const entries = (manifest.entries || []).filter((entry) => entry.type === "formula");
  const selectedEntries = packageName
    ? entries.filter((entry) => entry.name === packageName)
    : entries;
  if (selectedEntries.length === 0) {
    throw new Error(packageName ? `no managed formula entry named ${packageName}` : "tap-manifest.json has no managed formula entries");
  }

  const projections = [];
  for (const entry of selectedEntries) {
    projections.push(await projectEntry({
      manifest,
      entry,
      releasePassportOverride: entry.name === packageName ? releasePassport : "",
    }));
  }

  const nextManifest = {
    ...manifest,
    entries: (manifest.entries || []).map((entry) => {
      const projected = projections.find((candidate) => candidate.package === entry.name && entry.type === "formula");
      return projected ? projected.updatedEntry : entry;
    }),
  };

  const manifestChanged = `${JSON.stringify(manifest, null, 2)}\n` !== `${JSON.stringify(nextManifest, null, 2)}\n`;
  if (write) {
    for (const projection of projections) {
      if (projection.changes.formula) {
        writeText(path.join(cwd, projection.formulaPath), projection.formula);
      }
    }
    if (manifestChanged) {
      writeJson(manifestPath, nextManifest);
    }
  }

  const lock = updateLock ? await updateContractLock({ write }) : { changed: false, written: false };
  const changed = projections.some((projection) => projection.changed) || manifestChanged || lock.changed;
  const report = {
    schemaVersion: 1,
    contract: "kungfu-homebrew-tap-managed-product-update",
    ok: !check || !changed,
    mode: write ? "write" : check ? "check" : "dry-run",
    changed,
    written: write,
    packages: projections.map((projection) => ({
      package: projection.package,
      repository: projection.repository,
      tag: projection.tag,
      version: projection.version,
      releasePassportUrl: projection.releasePassportUrl,
      changed: projection.changed,
      changes: projection.changes,
      artifacts: projection.artifacts,
    })),
    manifest: {
      path: "tap-manifest.json",
      changed: manifestChanged,
      sha256: sha256Text(`${JSON.stringify(nextManifest, null, 2)}\n`),
    },
    buildchainContractLock: lock,
  };

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    for (const projection of report.packages) {
      const marker = projection.changed ? "update" : "current";
      process.stdout.write(`[managed-products] ${projection.package}: ${marker} ${projection.version} (${projection.tag})\n`);
    }
    if (updateLock) {
      process.stdout.write(`[managed-products] buildchain.contract-lock.json: ${lock.changed ? "update" : "current"} ${lock.resolvedSha || ""}\n`);
    }
  }

  if (check && changed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[managed-products] ${error.message}`);
  process.exitCode = 1;
});
