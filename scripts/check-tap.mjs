#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";

const cwd = process.cwd();
const manifestPath = path.join(cwd, "tap-manifest.json");
const contractLockPath = path.join(cwd, "buildchain.contract-lock.json");
const formulaPath = path.join(cwd, "Formula", "buildchain.rb");
const kfdPaths = {
  readme: "kfd/README.md",
  kfd1ContractWorld: "kfd/kfd-1.contract-world.json",
  kfd1Witness: "kfd/kfd-1.witness.json",
  kfd2ReleaseClaims: "kfd/kfd-2.release-claims.json",
  kfd3Interface: "kfd/kfd-3.collaboration-interface.json",
  kfd3Witness: "kfd/kfd-3.witness.json"
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256File(repoPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(cwd, repoPath))).digest("hex");
}

function digestJson(value) {
  return `sha256:${crypto.createHash("sha256").update(`${JSON.stringify(value, null, 2)}\n`).digest("hex")}`;
}

function fail(message) {
  console.error(`[tap-check] ${message}`);
  process.exitCode = 1;
}

function requireIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    fail(`${label} is missing: ${expected}`);
  }
}

function digestWithoutPrefix(digest) {
  return String(digest || "").replace(/^sha256:/, "");
}

function requirePath(repoPath, label = repoPath) {
  if (!fs.existsSync(path.join(cwd, repoPath))) {
    fail(`${label} is missing: ${repoPath}`);
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be a JSON object`);
    return false;
  }
  return true;
}

function requireSha(repoPath, expected, label = repoPath) {
  requirePath(repoPath, label);
  if (fs.existsSync(path.join(cwd, repoPath)) && expected !== sha256File(repoPath)) {
    fail(`${label} sha256 is stale; run node scripts/update-kfd-witnesses.mjs`);
  }
}

function pointerPath(pointer) {
  return pointer?.path || pointer?.pointer?.path;
}

function pointerSha(pointer) {
  return pointer?.sha256 || pointer?.pointer?.sha256;
}

function verifyPointer(pointer, label) {
  const repoPath = pointerPath(pointer);
  const expected = pointerSha(pointer);
  if (!repoPath || !expected) {
    fail(`${label} must include path and sha256`);
    return;
  }
  requireSha(repoPath, expected, label);
}

function listFiles(dir) {
  const root = path.join(cwd, dir);
  if (!fs.existsSync(root)) return [];
  const found = [];
  for (const name of fs.readdirSync(root, { withFileTypes: true })) {
    const child = path.join(dir, name.name);
    if (name.isDirectory()) {
      found.push(...listFiles(child));
    } else if (name.isFile()) {
      found.push(child);
    }
  }
  return found;
}

function actualControlFiles() {
  return [
    "ACCEPTABLE_USE.md",
    "AGENTS.md",
    "CONTRIBUTING.md",
    "Formula/buildchain.rb",
    "LICENSE",
    "PROVIDER_COMPLIANCE.md",
    "README.md",
    "SECURITY.md",
    "TRADEMARK.md",
    "buildchain.contract-lock.json",
    "buildchain.toml",
    "tap-manifest.json",
    ...listFiles(".github").filter((file) => file.endsWith(".yml") || file.endsWith(".md")),
    ...listFiles("docs").filter((file) => file.endsWith(".md")),
    ...listFiles("kfd").filter((file) => file.endsWith(".json") || file.endsWith(".md")),
    ...listFiles("scripts").filter((file) => file.endsWith(".mjs"))
  ].sort();
}

function verifyKfd() {
  for (const [label, repoPath] of Object.entries(kfdPaths)) {
    requirePath(repoPath, label);
  }

  const kfd1World = readJson(path.join(cwd, kfdPaths.kfd1ContractWorld));
  const kfd1Witness = readJson(path.join(cwd, kfdPaths.kfd1Witness));
  const kfd2Claims = readJson(path.join(cwd, kfdPaths.kfd2ReleaseClaims));
  const kfd3Interface = readJson(path.join(cwd, kfdPaths.kfd3Interface));
  const kfd3Witness = readJson(path.join(cwd, kfdPaths.kfd3Witness));

  if (kfd1World.contract !== "kfd-1-contract-world" || kfd1World.standard !== "kfd-1") {
    fail("kfd/kfd-1.contract-world.json must be a KFD-1 contract world");
  }
  if (!Array.isArray(kfd1World.surfaces) || kfd1World.surfaces.length === 0) {
    fail("KFD-1 contract world must declare surfaces");
  }
  for (const surface of kfd1World.surfaces || []) {
    if (!surface.id || !surface.class || !surface.description) {
      fail("KFD-1 contract world surfaces must include id, class, and description");
    }
  }

  if (kfd1Witness.contract !== "kfd-1-witness" || kfd1Witness.standard !== "kfd-1") {
    fail("kfd/kfd-1.witness.json must be a KFD-1 witness");
  }
  if (kfd1Witness.contractWorld?.schemaId !== "https://kfd.libkungfu.dev/schemas/kfd-1/contract-world.schema.json") {
    fail("KFD-1 witness must cite the canonical KFD-1 contract-world schema");
  }
  if (kfd1Witness.contractWorld?.digest !== digestJson(kfd1World)) {
    fail("KFD-1 witness contractWorld digest is stale; run node scripts/update-kfd-witnesses.mjs");
  }
  for (const [index, evidence] of (kfd1Witness.evidence || []).entries()) {
    verifyPointer(evidence, `KFD-1 evidence[${index}]`);
  }

  if (kfd2Claims.contract !== "kfd-2-release-claims" || kfd2Claims.standard !== "kfd-2") {
    fail("kfd/kfd-2.release-claims.json must be KFD-2 release claims");
  }
  if (!Array.isArray(kfd2Claims.claims) || kfd2Claims.claims.length < 3) {
    fail("KFD-2 release claims must include tap metadata, runtime lock, and tap KFD claims");
  }
  for (const [index, claim] of (kfd2Claims.claims || []).entries()) {
    if (!claim.id || !claim.statement || !claim.source || !Array.isArray(claim.evidence) || !claim.auditBoundary || !claim.responsibility) {
      fail(`KFD-2 claim[${index}] is missing required public trust fields`);
      continue;
    }
    if (claim.status !== "enforced") {
      fail(`KFD-2 claim ${claim.id} must be status=enforced`);
    }
    verifyPointer(claim.source, `KFD-2 claim ${claim.id} source`);
    for (const [evidenceIndex, evidence] of claim.evidence.entries()) {
      verifyPointer(evidence, `KFD-2 claim ${claim.id} evidence[${evidenceIndex}]`);
    }
  }

  if (kfd3Interface.contract !== "kfd-3-collaboration-interface" || kfd3Interface.standard !== "kfd-3") {
    fail("kfd/kfd-3.collaboration-interface.json must be a KFD-3 collaboration interface");
  }
  if (kfd3Interface.closure?.classificationMode !== "closed-world" || kfd3Interface.closure?.unclassifiedEntrypointsPolicy !== "fail") {
    fail("KFD-3 collaboration interface must use closed-world closure with fail policy");
  }
  const declared = [...(kfd3Interface.closure?.declaredFiles || [])].sort();
  const actual = actualControlFiles();
  if (JSON.stringify(declared) !== JSON.stringify(actual)) {
    fail(`KFD-3 declaredFiles does not match participant-facing control files; run node scripts/update-kfd-witnesses.mjs`);
  }
  const surfaceIds = new Set((kfd3Interface.surfaces || []).map((surface) => surface.id));
  for (const entrypoint of kfd3Interface.minimalEntrypoints || []) {
    if (!entrypoint.id || !entrypoint.surface || !Array.isArray(entrypoint.participants)) {
      fail("KFD-3 minimal entrypoints must include id, surface, and participants");
    }
    requirePath(entrypoint.surface, `KFD-3 entrypoint ${entrypoint.id}`);
  }
  for (const requiredSurface of ["tap-manifest", "formula-buildchain", "buildchain-runtime-lock", "tap-verification", "managed-product-updater", "kfd-claims"]) {
    if (!surfaceIds.has(requiredSurface)) {
      fail(`KFD-3 collaboration interface missing surface ${requiredSurface}`);
    }
  }

  if (kfd3Witness.contract !== "kfd-3-witness" || kfd3Witness.standard !== "kfd-3") {
    fail("kfd/kfd-3.witness.json must be a KFD-3 witness");
  }
  if (kfd3Witness.collaborationInterface?.schemaId !== "https://kfd.libkungfu.dev/schemas/kfd-3/collaboration-interface.schema.json") {
    fail("KFD-3 witness must cite the canonical KFD-3 collaboration-interface schema");
  }
  if (kfd3Witness.collaborationInterface?.digest !== digestJson(kfd3Interface)) {
    fail("KFD-3 witness collaborationInterface digest is stale; run node scripts/update-kfd-witnesses.mjs");
  }
  verifyPointer(kfd3Witness.sourceRegistry, "KFD-3 witness sourceRegistry");
  if (kfd3Witness.closure?.classificationMode !== "closed-world" || (kfd3Witness.closure?.unclassifiedEntrypoints || []).length !== 0) {
    fail("KFD-3 witness must have closed-world closure with no unclassified entrypoints");
  }
  if (JSON.stringify([...(kfd3Witness.closure?.declaredFiles || [])].sort()) !== JSON.stringify(actual)) {
    fail("KFD-3 witness declaredFiles is stale; run node scripts/update-kfd-witnesses.mjs");
  }
  for (const [group, entries] of Object.entries(kfd3Witness.evidence || {})) {
    if (!Array.isArray(entries)) continue;
    for (const [index, entry] of entries.entries()) {
      verifyPointer(entry, `KFD-3 evidence ${group}[${index}]`);
    }
  }
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "kungfu-systems-homebrew-tap-check"
        }
      });
      if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

const manifest = readJson(manifestPath);
const contractLock = readJson(contractLockPath);
const formula = fs.readFileSync(formulaPath, "utf8");
const buildchain = manifest.entries.find(
  (entry) => entry.type === "formula" && entry.name === "buildchain"
);

if (contractLock.contract !== "kungfu-buildchain-contract-lock") {
  fail("buildchain.contract-lock.json must be a Buildchain contract lock");
}
if (contractLock.buildchain?.ref !== "v2") {
  fail("buildchain.contract-lock.json must accept the Buildchain v2 floating runtime");
}
if (contractLock.buildchain?.compatibilityPolicy !== "major-compatible") {
  fail("buildchain.contract-lock.json must use the major-compatible policy");
}
if (!/^[0-9a-f]{40}$/i.test(contractLock.buildchain?.resolvedSha || "")) {
  fail("buildchain.contract-lock.json must record the resolved Buildchain SHA");
}
if (!Array.isArray(contractLock.buildchain?.surfaces) || contractLock.buildchain.surfaces.length === 0) {
  fail("buildchain.contract-lock.json must record accepted Buildchain contract surfaces");
}

if (!buildchain) {
  fail("tap-manifest.json must contain the buildchain formula entry");
} else {
  requireIncludes(formula, `version "${buildchain.version}"`, "formula version");
  requireIncludes(formula, `license "Apache-2.0"`, "formula license");

  for (const artifact of buildchain.artifacts) {
    requireIncludes(formula, artifact.url, `${artifact.platform} url`);
    requireIncludes(formula, artifact.sha256, `${artifact.platform} sha256`);
  }

  try {
    const passport = await fetchJson(buildchain.upstream.releasePassportUrl);
    if (passport.release?.tag !== buildchain.upstream.tag) {
      fail(`passport tag ${passport.release?.tag} does not match manifest ${buildchain.upstream.tag}`);
    }
    if (passport.release?.publishedVersion !== buildchain.version) {
      fail(`passport version ${passport.release?.publishedVersion} does not match manifest ${buildchain.version}`);
    }

    for (const [key, expectedStatus] of Object.entries(buildchain.kfd || {})) {
      const actualStatus = passport[key]?.status;
      if (actualStatus !== expectedStatus) {
        fail(`${key} status ${actualStatus} does not match manifest ${expectedStatus}`);
      }
    }

    const passportArtifacts = new Map(
      (passport.artifacts || []).map((artifact) => [artifact.name, digestWithoutPrefix(artifact.digest)])
    );
    for (const artifact of buildchain.artifacts) {
      const assetName = artifact.url.split("/").pop();
      const actualDigest = passportArtifacts.get(assetName);
      if (actualDigest !== artifact.sha256) {
        fail(`${assetName} digest ${actualDigest} does not match manifest ${artifact.sha256}`);
      }
    }
  } catch (error) {
    fail(error.message);
  }
}

verifyKfd();

if (!process.exitCode) {
  console.log("[tap-check] ok");
}
