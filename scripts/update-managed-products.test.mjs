// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { test } from "node:test";

import {
  formulaArchiveArtifacts,
  kfdNativeArtifacts,
  projectEntry,
  renderFormula,
} from "./update-managed-products.mjs";

const entry = {
  type: "formula",
  name: "kungfu",
  path: "Formula/kungfu.rb",
  formula: {
    kind: "kungfu-standalone-cli",
    desc: "Headless runtime fact ledger and agent-work CLI",
    homepage: "https://kungfu.tech",
    license: "Apache-2.0",
    managerCommand: [
      "brew",
      "upgrade",
      "--formula",
      "kungfu-systems/tap/kungfu",
    ],
    verificationCommand: ["kungfu", "--version"],
  },
};

const passport = {
  product: {
    repository: "kungfu-systems/kungfu",
  },
  release: {
    tag: "v4.0.0-alpha.1",
    publishedVersion: "4.0.0-alpha.1",
  },
  artifacts: [
    {
      name: "kungfu-episodes-cli-darwin-arm64.tar.gz",
      platform: "darwin-arm64",
      url: "https://example.invalid/kungfu-episodes-cli-darwin-arm64.tar.gz",
      sha256: "a".repeat(64),
    },
    {
      name: "kungfu-episodes-cli-linux-x64.tar.gz",
      platform: "linux-x64",
      url: "https://example.invalid/kungfu-episodes-cli-linux-x64.tar.gz",
      sha256: "b".repeat(64),
    },
    {
      name: "Kungfu-Episodes.dmg",
      platform: "darwin-arm64",
      url: "https://example.invalid/Kungfu-Episodes.dmg",
      sha256: "c".repeat(64),
    },
  ],
};

test("Kungfu Formula projects only standalone CLI archives and exact manager argv", () => {
  const artifacts = formulaArchiveArtifacts(passport, {
    repository: "kungfu-systems/kungfu",
    tag: passport.release.tag,
  }, entry);
  assert.deepEqual(
    artifacts.map((artifact) => artifact.name),
    [
      "kungfu-episodes-cli-darwin-arm64.tar.gz",
      "kungfu-episodes-cli-linux-x64.tar.gz",
    ],
  );

  const formula = renderFormula({
    entry,
    passport,
    artifacts,
    repository: "kungfu-systems/kungfu",
  });
  assert.match(formula, /class Kungfu < Formula/);
  assert.match(formula, /libexec\.install/);
  assert.match(formula, /mach_o_magics/);
  assert.match(formula, /system "codesign", "--force", "--sign", "-", path/);
  assert.match(formula, /manifest_path\.atomic_write/);
  assert.match(formula, /bin\.install_symlink libexec\/"kungfu"/);
  assert.match(
    formula,
    /"managerCommand"\s+=> \["brew", "upgrade", "--formula", "kungfu-systems\/tap\/kungfu"\]/,
  );
  assert.match(
    formula,
    /"verificationCommand"\s+=> \["kungfu", "--version"\]/,
  );
  assert.match(formula, /kungfu update status --json/);
  assert.match(formula, /kungfu run agent --help/);
  assert.doesNotMatch(formula, /Electron|Kungfu\.app/);
});

test("Kungfu Formula rejects a non-allowlisted manager command", () => {
  const artifacts = formulaArchiveArtifacts(passport, {
    repository: "kungfu-systems/kungfu",
    tag: passport.release.tag,
  }, entry);
  assert.throws(
    () => renderFormula({
      entry: {
        ...entry,
        formula: {
          ...entry.formula,
          managerCommand: ["sh", "-c", "brew upgrade kungfu"],
        },
      },
      passport,
      artifacts,
      repository: "kungfu-systems/kungfu",
    }),
    /trusted exact Homebrew argv/,
  );
});

test("exact Kungfu passport deterministically materializes Formula provenance and KFD", async () => {
  const completePassport = {
    ...passport,
    "kfd-1": { status: "passed" },
    "kfd-2": { status: "downgraded" },
    "kfd-3": { status: "passed" },
  };
  const projected = await projectEntry({
    entry: {
      ...entry,
      status: "planned",
      upstream: {
        repository: "kungfu-systems/kungfu",
        releasePassportAsset: "buildchain.release.json",
        channel: "alpha",
      },
      evidencePolicy: {
        allowedKfdStatuses: {
          "kfd-1": ["passed"],
          "kfd-2": ["passed", "downgraded"],
          "kfd-3": ["passed"],
        },
      },
    },
    planned: true,
    releasePassportOverride: `data:application/json,${encodeURIComponent(JSON.stringify(completePassport))}`,
  });

  assert.equal(projected.planned, true);
  assert.equal(projected.version, "4.0.0-alpha.1");
  assert.equal(
    projected.releasePassportUrl,
    "https://github.com/kungfu-systems/kungfu/releases/download/v4.0.0-alpha.1/buildchain.release.json",
  );
  assert.deepEqual(projected.updatedEntry.kfd, {
    "kfd-1": "passed",
    "kfd-2": "downgraded",
    "kfd-3": "passed",
  });
  assert.deepEqual(
    projected.updatedEntry.artifacts.map(({ name, sha256 }) => ({ name, sha256 })),
    [
      {
        name: "kungfu-episodes-cli-darwin-arm64.tar.gz",
        sha256: "a".repeat(64),
      },
      {
        name: "kungfu-episodes-cli-linux-x64.tar.gz",
        sha256: "b".repeat(64),
      },
    ],
  );
  assert.equal("status" in projected.updatedEntry, false);
  const rubySyntax = childProcess.spawnSync("ruby", ["-c"], {
    encoding: "utf8",
    input: projected.projection,
  });
  assert.equal(rubySyntax.status, 0, rubySyntax.stderr);
});

test("KFD native provenance projects four immutable Homebrew archives", async () => {
  const version = "1.0.0-alpha.63";
  const targets = {
    "darwin-arm64": "aarch64-apple-darwin",
    "darwin-x64": "x86_64-apple-darwin",
    "linux-arm64": "aarch64-unknown-linux-gnu",
    "linux-x64": "x86_64-unknown-linux-gnu",
  };
  const provenances = new Map();
  const assets = [];
  for (const target of Object.values(targets)) {
    const base = `kfd-${version}-${target}`;
    const archiveName = `${base}.tar.gz`;
    const provenanceName = `${base}.provenance.json`;
    const provenanceUrl = `https://example.invalid/${provenanceName}`;
    assets.push({
      name: archiveName,
      browser_download_url: `https://example.invalid/${archiveName}`,
      digest: `sha256:${"a".repeat(64)}`,
    });
    assets.push({
      name: provenanceName,
      browser_download_url: provenanceUrl,
      digest: `sha256:${"b".repeat(64)}`,
    });
    provenances.set(provenanceUrl, {
      schema: "kfd.native-release-provenance/v1",
      identity: {
        name: "kfd",
        version,
        target,
        sourceSha: "c".repeat(40),
        sourceTree: "d".repeat(40),
      },
      build: { implementation: "rust", sourceDirty: false },
      artifacts: { archive: { name: archiveName, sha256: "a".repeat(64) } },
      verification: { capabilityBoundary: ["verify", "bundle"] },
    });
  }

  const artifacts = await kfdNativeArtifacts({
    release: { assets },
    repository: "kungfu-systems/kfd",
    tag: `v${version}`,
    version,
    fetcher: async (url) => provenances.get(url),
  });
  assert.deepEqual(artifacts.map((artifact) => artifact.platform), Object.keys(targets));
  assert.ok(artifacts.every((artifact) => artifact.provenance.sourceTree === "d".repeat(40)));

  const formula = renderFormula({
    entry: {
      type: "formula",
      name: "kfd",
      formula: { kind: "kfd-native-cli" },
    },
    passport: { release: { publishedVersion: version } },
    artifacts,
    repository: "kungfu-systems/kfd",
  });
  assert.match(formula, /class Kfd < Formula/);
  assert.match(formula, /OS\.mac\? && Hardware::CPU\.intel\?/);
  assert.match(formula, /OS\.linux\? && Hardware::CPU\.arm\?/);
  assert.match(formula, /bin\.install payload_root\/"kfd"/);
  assert.match(formula, /kfd --version/);
  const rubySyntax = childProcess.spawnSync("ruby", ["-c"], {
    encoding: "utf8",
    input: formula,
  });
  assert.equal(rubySyntax.status, 0, rubySyntax.stderr);
});

test("shared Kungfu token requires an explicit Formula or Cask type", () => {
  const result = childProcess.spawnSync(
    process.execPath,
    ["scripts/update-managed-products.mjs", "--package", "kungfu"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ambiguous; pass --type formula or --type cask/);
});
