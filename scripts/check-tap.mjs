#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";

const cwd = process.cwd();
const manifestPath = path.join(cwd, "tap-manifest.json");
const contractLockPath = path.join(cwd, "buildchain.contract-lock.json");
const packageConfigPath = path.join(cwd, "package.json");
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

function optionalString(value) {
  return value === undefined || value === null ? "" : String(value);
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

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
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
    "buildchain.alpha-contract-lock.json",
    "buildchain.contract-lock.json",
    "buildchain.toml",
    "package.json",
    "tap-manifest.json",
    ...listFiles("Casks").filter((file) => file.endsWith(".rb")),
    ...listFiles(".github").filter((file) => file.endsWith(".yml") || file.endsWith(".md")),
    ...listFiles("docs").filter((file) => file.endsWith(".md")),
    ...listFiles("kfd").filter((file) => file.endsWith(".json") || file.endsWith(".md")),
    ...listFiles("scripts").filter((file) => file.endsWith(".mjs"))
  ].sort();
}

function assetNameFromUrl(url) {
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return optionalString(url);
    }
  })();
  return decodeURIComponent(pathname.split("/").pop() || "");
}

function verifyKfdProjection(entry, passport) {
  for (const [key, expectedStatus] of Object.entries(entry.kfd || {})) {
    const actualStatus = passport[key]?.status;
    if (actualStatus !== expectedStatus) {
      fail(`${entry.type}/${entry.name} ${key} status ${actualStatus} does not match manifest ${expectedStatus}`);
    }
  }
}

function passportArtifactDigestMap(passport) {
  return new Map(
    (passport.artifacts || []).map((artifact) => [artifact.name, digestWithoutPrefix(artifact.digest || artifact.sha256 || artifact.checksum)])
  );
}

async function verifyPassportBoundEntry(entry) {
  if (!entry.type || !entry.name || !entry.path) {
    fail("tap-manifest entries must include type, name, and path");
    return;
  }
  if (!["formula", "cask"].includes(entry.type)) {
    fail(`tap-manifest entry ${entry.name} has unsupported type ${entry.type}`);
    return;
  }
  requirePath(entry.path, `${entry.type}/${entry.name}`);
  const text = fs.existsSync(path.join(cwd, entry.path)) ? fs.readFileSync(path.join(cwd, entry.path), "utf8") : "";
  requireIncludes(text, `version "${entry.version}"`, `${entry.type}/${entry.name} version`);

  if (entry.type === "formula") {
    requireIncludes(text, `license "Apache-2.0"`, `${entry.type}/${entry.name} license`);
  } else {
    requireIncludes(text, `cask "${entry.name}"`, `${entry.type}/${entry.name} token`);
    requireIncludes(text, `app "${entry.cask?.app || "Kungfu.app"}"`, `${entry.type}/${entry.name} app`);
  }

  if (!entry.upstream?.releasePassportUrl) {
    fail(`${entry.type}/${entry.name} must declare upstream.releasePassportUrl`);
    return;
  }

  try {
    const passport = await fetchJson(entry.upstream.releasePassportUrl);
    if (passport.release?.tag !== entry.upstream.tag) {
      fail(`${entry.type}/${entry.name} passport tag ${passport.release?.tag} does not match manifest ${entry.upstream.tag}`);
    }
    if (passport.release?.publishedVersion !== entry.version) {
      fail(`${entry.type}/${entry.name} passport version ${passport.release?.publishedVersion} does not match manifest ${entry.version}`);
    }

    verifyKfdProjection(entry, passport);

    const passportArtifacts = passportArtifactDigestMap(passport);
    for (const artifact of entry.artifacts || []) {
      requireIncludes(text, artifact.url, `${entry.type}/${entry.name} ${artifact.platform} url`);
      requireIncludes(text, artifact.sha256, `${entry.type}/${entry.name} ${artifact.platform} sha256`);
      const assetName = artifact.name || assetNameFromUrl(artifact.url);
      const actualDigest = passportArtifacts.get(assetName);
      if (actualDigest !== artifact.sha256) {
        fail(`${entry.type}/${entry.name} ${assetName} digest ${actualDigest} does not match manifest ${artifact.sha256}`);
      }
    }
  } catch (error) {
    fail(`${entry.type}/${entry.name}: ${error.message}`);
  }
}

function verifyManifest(manifest) {
  requireArray(manifest.entries, "tap-manifest.entries");
  const installableKeys = new Set();
  const installablePaths = new Set();
  for (const entry of manifest.entries || []) {
    const key = `${entry.type}/${entry.name}`;
    if (installableKeys.has(key)) {
      fail(`duplicate tap entry ${key}`);
    }
    installableKeys.add(key);
    if (entry.path) installablePaths.add(entry.path);
  }

  for (const entry of manifest.plannedEntries || []) {
    if (!entry.type || !entry.name || !entry.path || !entry.upstream?.repository) {
      fail("plannedEntries must include type, name, path, and upstream.repository");
      continue;
    }
    const key = `${entry.type}/${entry.name}`;
    if (installableKeys.has(key)) {
      fail(`planned entry ${key} is also installable`);
    }
    if (fs.existsSync(path.join(cwd, entry.path))) {
      fail(`planned entry ${key} has an installable file at ${entry.path}; materialize it into entries or remove the file`);
    }
  }

  for (const caskFile of listFiles("Casks").filter((file) => file.endsWith(".rb"))) {
    if (!installablePaths.has(caskFile)) {
      fail(`cask file ${caskFile} is not declared as an installable tap-manifest entry`);
    }
  }
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
  for (const requiredSurface of ["tap-manifest", "formula-buildchain", "managed-cli-formula", "buildchain-runtime-lock", "tap-verification", "managed-product-updater", "managed-cask-support", "kfd-claims"]) {
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
const packageConfig = readJson(packageConfigPath);
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
if (
  packageConfig.name !== "@kungfu-systems/homebrew-tap"
  || packageConfig.private !== true
  || packageConfig.packageManager !== "npm@11.7.0"
) {
  fail("package.json must retain the private zero-dependency Buildchain npm@11.7.0 consumer contract");
}

verifyManifest(manifest);

if (!buildchain) {
  fail("tap-manifest.json must contain the buildchain formula entry");
}

for (const entry of manifest.entries || []) {
  await verifyPassportBoundEntry(entry);
}

verifyKfd();

if (!process.exitCode) {
  console.log("[tap-check] ok");
}
