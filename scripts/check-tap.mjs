#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const manifestPath = path.join(cwd, "tap-manifest.json");
const contractLockPath = path.join(cwd, "buildchain.contract-lock.json");
const formulaPath = path.join(cwd, "Formula", "buildchain.rb");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
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

if (!process.exitCode) {
  console.log("[tap-check] ok");
}
