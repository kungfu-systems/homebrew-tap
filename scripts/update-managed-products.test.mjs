// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { test } from "node:test";

import {
  formulaArchiveArtifacts,
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
  assert.match(formula, /bin\.install_symlink libexec\/"kungfu"/);
  assert.match(
    formula,
    /"managerCommand" => \["brew","upgrade","--formula","kungfu-systems\/tap\/kungfu"\]/,
  );
  assert.match(
    formula,
    /"verificationCommand" => \["kungfu","--version"\]/,
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
    "kfd-2": { status: "passed" },
    "kfd-3": { status: "passed" },
  };
  const projected = await projectEntry({
    entry: {
      ...entry,
      status: "planned",
      upstream: {
        repository: "kungfu-systems/kungfu",
        releasePassportAsset: "kungfu.release.json",
        channel: "alpha",
      },
    },
    planned: true,
    releasePassportOverride: `data:application/json,${encodeURIComponent(JSON.stringify(completePassport))}`,
  });

  assert.equal(projected.planned, true);
  assert.equal(projected.version, "4.0.0-alpha.1");
  assert.equal(
    projected.releasePassportUrl,
    "https://github.com/kungfu-systems/kungfu/releases/download/v4.0.0-alpha.1/kungfu.release.json",
  );
  assert.deepEqual(projected.updatedEntry.kfd, {
    "kfd-1": "passed",
    "kfd-2": "passed",
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

test("shared Kungfu token requires an explicit Formula or Cask type", () => {
  const result = childProcess.spawnSync(
    process.execPath,
    ["scripts/update-managed-products.mjs", "--package", "kungfu"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ambiguous; pass --type formula or --type cask/);
});
