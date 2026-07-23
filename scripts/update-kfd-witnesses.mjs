#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const outDir = path.join(cwd, "kfd");

const KFD_SCHEMA_IDS = {
  kfd1ContractWorld: "https://kfd.libkungfu.dev/schemas/kfd-1/contract-world.schema.json",
  kfd1Witness: "https://kfd.libkungfu.dev/schemas/kfd-1/witness.schema.json",
  kfd2ReleaseClaims: "https://kfd.libkungfu.dev/schemas/kfd-2/release-claims.schema.json",
  kfd3CollaborationInterface: "https://kfd.libkungfu.dev/schemas/kfd-3/collaboration-interface.schema.json",
  kfd3Witness: "https://kfd.libkungfu.dev/schemas/kfd-3/witness.schema.json",
};

const files = {
  readme: "README.md",
  agents: "AGENTS.md",
  contributing: "CONTRIBUTING.md",
  docsMap: "docs/MAP.md",
  kungfuCliFormulaGuide: "docs/KUNGFU-CLI-FORMULA.md",
  kungfuGuiCaskGuide: "docs/KUNGFU-GUI-CASK.md",
  license: "LICENSE",
  security: "SECURITY.md",
  trademark: "TRADEMARK.md",
  acceptableUse: "ACCEPTABLE_USE.md",
  providerCompliance: "PROVIDER_COMPLIANCE.md",
  issueTemplateConfig: ".github/ISSUE_TEMPLATE/config.yml",
  prTemplate: ".github/pull_request_template.md",
  tapManifest: "tap-manifest.json",
  packageManagerContract: "package.json",
  formulaBuildchain: "Formula/buildchain.rb",
  buildchainConfig: "buildchain.toml",
  buildchainAlphaContractLock: "buildchain.alpha-contract-lock.json",
  buildchainContractLock: "buildchain.contract-lock.json",
  buildchainValidateWorkflow: ".github/workflows/buildchain-validate.yml",
  managedProductUpdatesWorkflow: ".github/workflows/managed-product-updates.yml",
  tapCheckWorkflow: ".github/workflows/tap-check.yml",
  tapCheckScript: "scripts/check-tap.mjs",
  managedProductUpdateScript: "scripts/update-managed-products.mjs",
  managedProductUpdateTest: "scripts/update-managed-products.test.mjs",
  kfdUpdateScript: "scripts/update-kfd-witnesses.mjs",
  kfdReadme: "kfd/README.md",
  kfd1ContractWorld: "kfd/kfd-1.contract-world.json",
  kfd1Witness: "kfd/kfd-1.witness.json",
  kfd2ReleaseClaims: "kfd/kfd-2.release-claims.json",
  kfd3Interface: "kfd/kfd-3.collaboration-interface.json",
  kfd3Witness: "kfd/kfd-3.witness.json",
};

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

const caskFiles = listFiles("Casks").filter((file) => file.endsWith(".rb")).sort();
const declaredFiles = [...Object.values(files), ...caskFiles].sort();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(cwd, filePath), "utf8"));
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(path.join(cwd, filePath)));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function digestJson(value) {
  return `sha256:${sha256Buffer(Buffer.from(stableJson(value)))}`;
}

function pointer(filePath, description = undefined) {
  return {
    path: filePath,
    sha256: sha256File(filePath),
    ...(description ? { description } : {}),
  };
}

function evidencePointer(filePath, description = undefined, kind = "file") {
  return {
    type: kind === "command" ? "command-result" : "file",
    pointer: {
      kind,
      path: filePath,
      sha256: sha256File(filePath),
    },
    ...(description ? { description } : {}),
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(path.join(cwd, filePath)), { recursive: true });
  fs.writeFileSync(path.join(cwd, filePath), stableJson(value));
}

const manifest = readJson(files.tapManifest);
const buildchain = manifest.entries.find((entry) => (
  entry.type === "formula" && entry.name === "buildchain"
));
if (!buildchain) {
  throw new Error("tap-manifest.json must contain the buildchain formula entry");
}

const product = {
  name: "Kungfu Systems Homebrew Tap",
  version: "repository-current",
  repository: "kungfu-systems/homebrew-tap",
};

const kfd1ContractWorld = {
  schemaVersion: 1,
  contract: "kfd-1-contract-world",
  standard: "kfd-1",
  factSource: files.tapManifest,
  product,
  surfaces: [
    {
      id: "tap-manifest",
      class: "cross-time",
      description: "Machine-readable tap distribution index and upstream release evidence binding.",
      path: files.tapManifest,
    },
    {
      id: "formula-buildchain",
      class: "cross-time",
      description: "Homebrew formula projected from the tap manifest and upstream release passport.",
      path: files.formulaBuildchain,
    },
    {
      id: "managed-cli-formula",
      class: "integration-time",
      description: "Prepared standalone Kungfu CLI Formula projection with exact package-manager argv and release-passport gating.",
      path: files.kungfuCliFormulaGuide,
    },
    {
      id: "managed-cask-support",
      class: "integration-time",
      description: "Prepared cask publication surface for materializing Kungfu GUI App release passports into Homebrew casks.",
      path: files.kungfuGuiCaskGuide,
    },
    {
      id: "buildchain-runtime-lock",
      class: "integration-time",
      description: "Accepted Buildchain @v2 runtime contract for CI lifecycle checks.",
      path: files.buildchainContractLock,
    },
    {
      id: "buildchain-package-manager-contract",
      class: "integration-time",
      description: "Private zero-dependency pnpm consumer declaration required by the Buildchain trust gate and runtime bootstrap.",
      path: files.packageManagerContract,
    },
    {
      id: "tap-verification",
      class: "integration-time",
      description: "Local and CI verification commands that reject formula, evidence, KFD, and workflow drift.",
      path: files.tapCheckScript,
    },
    {
      id: "managed-product-updates",
      class: "integration-time",
      description: "Managed product updater that projects upstream release passports into Homebrew formulae, casks, manifest, and Buildchain runtime lock updates.",
      path: files.managedProductUpdateScript,
    },
    {
      id: "kfd-claims",
      class: "cross-time",
      description: "Tap-local KFD-1/2/3 claim and witness files consumed by tap verification.",
      path: "kfd/",
    },
  ],
};

writeJson(files.kfd1ContractWorld, kfd1ContractWorld);

const kfd1Witness = {
  schemaVersion: 1,
  contract: "kfd-1-witness",
  standard: "kfd-1",
  product,
  contractWorld: {
    schemaId: KFD_SCHEMA_IDS.kfd1ContractWorld,
    digest: digestJson(kfd1ContractWorld),
  },
  evidence: [
    { kind: "file", path: files.tapManifest, sha256: sha256File(files.tapManifest) },
    { kind: "file", path: files.formulaBuildchain, sha256: sha256File(files.formulaBuildchain) },
    { kind: "file", path: files.kungfuCliFormulaGuide, sha256: sha256File(files.kungfuCliFormulaGuide) },
    { kind: "file", path: files.kungfuGuiCaskGuide, sha256: sha256File(files.kungfuGuiCaskGuide) },
    { kind: "file", path: files.buildchainContractLock, sha256: sha256File(files.buildchainContractLock) },
    { kind: "file", path: files.packageManagerContract, sha256: sha256File(files.packageManagerContract) },
    { kind: "file", path: files.managedProductUpdatesWorkflow, sha256: sha256File(files.managedProductUpdatesWorkflow) },
    { kind: "file", path: files.managedProductUpdateScript, sha256: sha256File(files.managedProductUpdateScript) },
    { kind: "file", path: files.tapCheckWorkflow, sha256: sha256File(files.tapCheckWorkflow) },
    { kind: "file", path: files.tapCheckScript, sha256: sha256File(files.tapCheckScript) },
    { kind: "file", path: files.kfd1ContractWorld, sha256: sha256File(files.kfd1ContractWorld) },
  ],
  closure: {
    mode: "declared-files",
    declaredFiles,
  },
  result: "pass",
};

writeJson(files.kfd1Witness, kfd1Witness);

const kfd2Claims = {
  schemaVersion: 1,
  contract: "kfd-2-release-claims",
  standard: "kfd-2",
  product: {
    name: product.name,
    repository: product.repository,
  },
  release: {
    version: "repository-current",
    channel: "main",
    sourceSha: "commit-addressed repository contents",
  },
  claims: [
    {
      id: "upstream-release-evidence",
      statement: "Every installable formula or cask entry is bound to upstream release passport evidence before it is presented as Homebrew metadata.",
      category: "release",
      source: { kind: "file", path: files.tapManifest, sha256: sha256File(files.tapManifest) },
      evidence: [
        evidencePointer(files.tapManifest, "Tap entry declares upstream release passport and KFD status."),
        evidencePointer(files.formulaBuildchain, "Formula version, URLs, and SHA-256 values must match tap-manifest.json."),
        evidencePointer(files.kungfuCliFormulaGuide, "Standalone Kungfu CLI Formula materialization and package-manager ownership boundary."),
        evidencePointer(files.kungfuGuiCaskGuide, "Kungfu GUI App cask publication path and release-passport requirements."),
        evidencePointer(files.managedProductUpdateScript, "Managed updater projects the latest upstream release passport into formula, cask, and manifest state.", "command"),
        evidencePointer(files.managedProductUpdatesWorkflow, "Scheduled and manual workflow opens and auto-merges update PRs for managed entries."),
        evidencePointer(files.tapCheckScript, "Verification fetches upstream release passport and compares tag, version, KFD status, and artifact digests.", "command"),
      ],
      verification: {
        command: "node scripts/check-tap.mjs",
        expectedResult: "pass",
      },
      auditBoundary: {
        scope: "Homebrew tap metadata for installable formulae and casks declared in tap-manifest.json",
        enumerability: "closed-world",
      },
      responsibility: {
        owner: "Kungfu Systems maintainers",
        sourceOwner: "Upstream release repositories own release passports and artifacts",
        verificationOwner: "homebrew-tap verification",
        releaseDecisionOwner: "Kungfu Systems maintainers",
      },
      residualRisk: [],
      status: "enforced",
    },
    {
      id: "buildchain-runtime-contract",
      statement: "The tap uses Buildchain @v2 only with a reviewed consumer contract lock and CI trust gate.",
      category: "kfd-1",
      source: { kind: "file", path: files.buildchainContractLock, sha256: sha256File(files.buildchainContractLock) },
      evidence: [
        evidencePointer(files.buildchainContractLock, "Accepted Buildchain @v2 contract digest and breaking-surface set."),
        evidencePointer(files.packageManagerContract, "Exact zero-dependency package-manager declaration consumed by the Buildchain trust gate."),
        evidencePointer(files.tapCheckWorkflow, "Tap Check calls the Buildchain reusable workflow with buildchain-contract-lock-path."),
        evidencePointer(files.buildchainValidateWorkflow, "Buildchain Validate rejects a missing contract lock."),
      ],
      verification: {
        command: "Buildchain reusable workflow trust gate, then node scripts/check-tap.mjs",
        expectedResult: "pass",
      },
      auditBoundary: {
        scope: "Buildchain runtime contract used by this tap's CI lifecycle verification",
        enumerability: "closed-world",
      },
      responsibility: {
        owner: "Kungfu Systems maintainers",
        sourceOwner: "Buildchain release process",
        verificationOwner: "Buildchain reusable workflow trust gate",
        releaseDecisionOwner: "Kungfu Systems maintainers",
      },
      residualRisk: [],
      status: "enforced",
    },
    {
      id: "tap-kfd-support",
      statement: "The tap declares and verifies its own KFD-1 distribution surface, KFD-2 public trust claims, and KFD-3 collaboration interface.",
      category: "kfd-3",
      source: { kind: "file", path: files.kfdReadme, sha256: sha256File(files.kfdReadme) },
      evidence: [
        evidencePointer(files.kfd1ContractWorld, "KFD-1 contract world for tap distribution facts."),
        evidencePointer(files.kfd1Witness, "KFD-1 witness for declared fact surfaces."),
        evidencePointer(files.kfdReadme, "Tap-local KFD file map for KFD-1/2/3 support."),
        evidencePointer(files.tapCheckScript, "Verification rejects stale hashes and undeclared control surfaces.", "command"),
      ],
      verification: {
        command: "node scripts/check-tap.mjs",
        expectedResult: "pass",
      },
      auditBoundary: {
        scope: "Tap-local public distribution, trust, and collaboration surfaces",
        enumerability: "closed-world",
      },
      responsibility: {
        owner: "Kungfu Systems maintainers",
        sourceOwner: "homebrew-tap repository",
        verificationOwner: "homebrew-tap verification",
        releaseDecisionOwner: "Kungfu Systems maintainers",
      },
      residualRisk: [],
      status: "enforced",
    },
  ],
  schemaEvolution: {
    rule: "KFD-owned schemas are cited by URL; tap-local compatible additions keep schemaVersion 1.",
  },
};

writeJson(files.kfd2ReleaseClaims, kfd2Claims);

const participants = [
  { id: "installer", kind: "human", description: "A person installing Kungfu Systems tools with Homebrew." },
  { id: "agent-reader", kind: "agent", description: "An agent inspecting tap metadata, release evidence, and KFD witnesses." },
  { id: "maintainer", kind: "maintainer", description: "A maintainer adding or updating tap entries and verification evidence." },
  { id: "release-system", kind: "service-integrator", description: "A CI or release system verifying tap metadata and Buildchain contract drift." },
];

const minimalEntrypoints = [
  { id: "readme", surface: files.readme, participants: ["installer", "agent-reader"], purpose: "Install packages and understand the tap role." },
  { id: "agents", surface: files.agents, participants: ["agent-reader", "maintainer"], purpose: "Route agents to usage, repository map, contribution, and verification surfaces." },
  { id: "docs-map", surface: files.docsMap, participants: ["installer", "agent-reader", "maintainer"], purpose: "Find tap structure, checks, KFD claims, and governance documents." },
  { id: "tap-manifest", surface: files.tapManifest, participants: ["agent-reader", "release-system"], purpose: "Consume the machine-readable distribution index." },
  { id: "kfd-readme", surface: files.kfdReadme, participants: ["agent-reader", "maintainer", "release-system"], purpose: "Inspect the tap-local KFD claim and witness map." },
  { id: "managed-product-updater", surface: files.managedProductUpdateScript, participants: ["agent-reader", "maintainer", "release-system"], purpose: "Update managed formulae from upstream release passports and refresh compatible Buildchain runtime locks." },
  { id: "kungfu-cli-formula-guide", surface: files.kungfuCliFormulaGuide, participants: ["installer", "agent-reader", "maintainer", "release-system"], purpose: "Prepare or audit the standalone Kungfu CLI Formula publication path." },
  { id: "kungfu-gui-cask-guide", surface: files.kungfuGuiCaskGuide, participants: ["agent-reader", "maintainer", "release-system"], purpose: "Prepare or audit the Kungfu GUI App cask publication path." },
];

const surfaces = [
  { id: "readme", kind: "markdown-doc", participants: ["installer", "agent-reader"], value: "Installation and release-evidence overview.", discoverability: { fromMinimalEntrypoint: true, path: files.readme }, maturity: "stable" },
  { id: "agents", kind: "markdown-doc", participants: ["agent-reader", "maintainer"], value: "Agent-facing repository route map.", discoverability: { fromMinimalEntrypoint: true, path: files.agents }, maturity: "stable" },
  { id: "docs-map", kind: "markdown-doc", participants: ["installer", "agent-reader", "maintainer"], value: "Question-to-source routing map.", discoverability: { fromMinimalEntrypoint: true, path: files.docsMap }, maturity: "stable" },
  { id: "governance-docs", kind: "markdown-doc", participants: ["installer", "agent-reader", "maintainer"], value: "License, security, trademark, acceptable use, provider compliance, contribution, issue, and PR boundaries.", discoverability: { fromMinimalEntrypoint: true, path: "LICENSE, SECURITY.md, TRADEMARK.md, ACCEPTABLE_USE.md, PROVIDER_COMPLIANCE.md, CONTRIBUTING.md, .github/*" }, maturity: "stable" },
  { id: "tap-manifest", kind: "json-api", participants: ["agent-reader", "release-system"], value: "Machine-readable tap distribution index.", discoverability: { fromMinimalEntrypoint: true, path: files.tapManifest }, maturity: "stable" },
  { id: "formula-buildchain", kind: "config", participants: ["installer", "agent-reader"], value: "Homebrew formula for Buildchain release artifacts.", discoverability: { fromMinimalEntrypoint: true, path: files.formulaBuildchain }, maturity: "stable" },
  { id: "managed-cli-formula", kind: "config", participants: ["installer", "agent-reader", "maintainer", "release-system"], value: "Release-passport-gated standalone Kungfu CLI Formula projection with exact Homebrew update and verification argv; planned until official CLI artifacts exist.", discoverability: { fromMinimalEntrypoint: true, path: `${files.tapManifest}, ${files.kungfuCliFormulaGuide}, Formula/kungfu.rb` }, maturity: "prepared" },
  { id: "managed-cask-support", kind: "config", participants: ["installer", "agent-reader", "maintainer", "release-system"], value: "Prepared Homebrew cask projection path for the Kungfu GUI App; planned entries are not installable until materialized from an upstream release passport.", discoverability: { fromMinimalEntrypoint: true, path: `${files.tapManifest}, ${files.kungfuGuiCaskGuide}, Casks/*.rb` }, maturity: "prepared" },
  { id: "buildchain-runtime-lock", kind: "json-api", participants: ["agent-reader", "release-system"], value: "Accepted Buildchain @v2 stable and @v2-alpha runtime contract locks.", discoverability: { fromMinimalEntrypoint: true, path: `${files.buildchainContractLock}, ${files.buildchainAlphaContractLock}` }, maturity: "stable" },
  { id: "buildchain-package-manager-contract", kind: "config", participants: ["agent-reader", "release-system", "maintainer"], value: "Private zero-dependency pnpm consumer declaration used only for Buildchain package-manager detection and runtime bootstrap.", discoverability: { fromMinimalEntrypoint: true, path: files.packageManagerContract }, maturity: "stable" },
  { id: "buildchain-lifecycle", kind: "config", participants: ["maintainer", "release-system"], value: "Buildchain lifecycle declaration and GitHub workflow callers.", discoverability: { fromMinimalEntrypoint: true, path: "buildchain.toml, .github/workflows/*.yml" }, maturity: "stable" },
  { id: "tap-verification", kind: "cli-command", participants: ["maintainer", "release-system", "agent-reader"], value: "Repository self-check for tap metadata, upstream release passports, KFD witnesses, and declared control surfaces.", discoverability: { fromMinimalEntrypoint: true, path: "node scripts/check-tap.mjs" }, maturity: "stable" },
  { id: "managed-product-updater", kind: "cli-command", participants: ["maintainer", "release-system", "agent-reader"], value: "Dry-run, check, or write managed formula and cask updates from upstream release passports, including compatible Buildchain @v2 lock refresh and automation PR auto-merge.", discoverability: { fromMinimalEntrypoint: true, path: "node scripts/update-managed-products.mjs --help, .github/workflows/managed-product-updates.yml" }, maturity: "stable" },
  { id: "kfd-claims", kind: "json-api", participants: ["agent-reader", "release-system", "maintainer"], value: "Tap-local KFD-1/2/3 claims and witnesses.", discoverability: { fromMinimalEntrypoint: true, path: "kfd/*.json" }, maturity: "stable" },
];

const kfd3Interface = {
  schemaVersion: 1,
  contract: "kfd-3-collaboration-interface",
  standard: "kfd-3",
  product,
  sourceRegistry: {
    path: files.kfd3Interface,
  },
  factSources: [
    {
      id: "homebrew-tap-repository",
      kind: "git-repository",
      host: "github",
      repository: product.repository,
      url: "https://github.com/kungfu-systems/homebrew-tap",
      loadBearingCoordinate: "commit-addressed repository contents",
      canonicalPaths: declaredFiles,
      projectionSurfaces: [
        "Homebrew formulae and casks",
        "Buildchain lifecycle artifacts",
        "tap-local KFD witnesses",
      ],
    },
  ],
  participants,
  minimalEntrypoints,
  surfaces,
  transparentConstraints: [
    {
      id: "upstream-passport-authority",
      appliesTo: ["tap-manifest", "formula-buildchain", "managed-cli-formula", "managed-cask-support"],
      restriction: "The tap may project upstream release facts but cannot become the upstream artifact authority.",
      rationale: "Release artifacts and KFD status are owned by upstream release passports.",
      reviewPath: files.tapCheckScript,
    },
    {
      id: "planned-cli-formula-is-not-installable",
      appliesTo: ["managed-cli-formula", "tap-verification"],
      restriction: "The planned Kungfu CLI Formula must not create Formula/kungfu.rb until an exact official release passport materializes it into installable entries.",
      rationale: "Homebrew metadata must not advertise unpublished or unverifiable standalone CLI bytes.",
      reviewPath: files.kungfuCliFormulaGuide,
    },
    {
      id: "planned-cask-is-not-installable",
      appliesTo: ["managed-cask-support", "tap-verification"],
      restriction: "A planned cask entry must not create Casks/*.rb until a release passport materializes it into installable tap-manifest entries.",
      rationale: "Kungfu GUI App distribution should be prepared without advertising a non-existent Homebrew cask.",
      reviewPath: files.kungfuGuiCaskGuide,
    },
    {
      id: "floating-runtime-lock",
      appliesTo: ["buildchain-runtime-lock", "buildchain-package-manager-contract", "buildchain-lifecycle", "managed-product-updater"],
      restriction: "Buildchain @v2 and @v2-alpha movement must pass their channel-specific consumer contract lock before lifecycle verification.",
      rationale: "Floating refs are useful only when incompatible runtime contract drift fails closed.",
      reviewPath: files.tapCheckWorkflow,
    },
    {
      id: "automation-auto-merge-boundary",
      appliesTo: ["managed-product-updater"],
      restriction: "Only the managed updater workflow may auto-merge its own automation branch after release-passport validation and repository requirements pass.",
      rationale: "Routine upstream release propagation should not require daily human attention, but arbitrary contributor PRs must not inherit that privilege.",
      reviewPath: files.managedProductUpdatesWorkflow,
    },
    {
      id: "closed-control-surface",
      appliesTo: ["kfd-claims", "tap-verification"],
      restriction: "Participant-facing control surfaces must be listed in closure.declaredFiles.",
      rationale: "A new script, workflow, formula, or manual must not become an undeclared backdoor surface.",
      reviewPath: files.tapCheckScript,
    },
  ],
  choicePaths: [
    {
      id: "install-or-inspect",
      participants: ["installer", "agent-reader"],
      choices: [
        { id: "install", label: "Install from README/Homebrew formula" },
        { id: "inspect", label: "Inspect tap-manifest.json and upstream release passport first" },
      ],
    },
    {
      id: "maintain-or-verify",
      participants: ["maintainer", "release-system", "agent-reader"],
      choices: [
        { id: "update-entry", label: "Run the managed updater, then regenerate KFD witnesses" },
        { id: "materialize-kungfu-formula", label: "Materialize the standalone Kungfu CLI Formula from an exact release passport" },
        { id: "materialize-kungfu-cask", label: "Materialize the Kungfu GUI cask from a release passport" },
        { id: "verify", label: "Run node scripts/check-tap.mjs or Buildchain lifecycle verify" },
      ],
    },
  ],
  extensionRequests: [
    {
      id: "new-tap-surface",
      participants: ["maintainer", "agent-reader"],
      trigger: "A new formula, cask, script, workflow, or public manual is needed.",
      requestPath: {
        kind: "repository-pr",
        target: "https://github.com/kungfu-systems/homebrew-tap",
      },
      expectedOutcome: "Update the relevant source file, declaredFiles closure, KFD witnesses, and verification script together.",
    },
  ],
  closure: {
    classificationMode: "closed-world",
    unclassifiedEntrypointsPolicy: "fail",
    reachableSurfaceSource: files.tapCheckScript,
    declaredFiles,
  },
};

writeJson(files.kfd3Interface, kfd3Interface);

const kfd3Witness = {
  schemaVersion: 1,
  contract: "kfd-3-witness",
  standard: "kfd-3",
  product,
  collaborationInterface: {
    schemaId: KFD_SCHEMA_IDS.kfd3CollaborationInterface,
    digest: digestJson(kfd3Interface),
  },
  sourceRegistry: pointer(files.kfd3Interface),
  evidence: {
    minimalEntrypoints: minimalEntrypoints.map((entry) => pointer(entry.surface, entry.purpose)),
    discoverability: [
      pointer(files.readme, "Install and release-evidence entrypoint."),
      pointer(files.agents, "Agent routing entrypoint."),
      pointer(files.docsMap, "Documentation map."),
      pointer(files.kungfuGuiCaskGuide, "Kungfu GUI cask publication guide."),
      pointer(files.kungfuCliFormulaGuide, "Kungfu standalone CLI Formula publication guide."),
      pointer(files.tapManifest, "Machine-readable tap entry facts."),
      pointer(files.managedProductUpdateScript, "Managed update command."),
      pointer(files.managedProductUpdatesWorkflow, "Managed update workflow."),
      pointer(files.kfdReadme, "Tap-local KFD map."),
    ],
    transparentConstraints: [
      pointer(files.tapCheckScript, "Closed-world verification command."),
      pointer(files.kungfuGuiCaskGuide, "Planned cask materialization boundary."),
      pointer(files.kungfuCliFormulaGuide, "Planned CLI Formula materialization and exact argv boundary."),
      pointer(files.tapCheckWorkflow, "Buildchain reusable workflow trust gate."),
      pointer(files.buildchainValidateWorkflow, "Config and lock presence validation."),
      pointer(files.managedProductUpdateScript, "Managed update lock refresh gate."),
      pointer(files.managedProductUpdatesWorkflow, "Automated update PR boundary."),
    ],
    choicePaths: [
      pointer(files.readme, "Install path."),
      pointer(files.docsMap, "Inspection path."),
      pointer(files.contributing, "Maintenance path."),
      pointer(files.kungfuGuiCaskGuide, "Kungfu GUI cask publication path."),
      pointer(files.kungfuCliFormulaGuide, "Kungfu CLI Formula publication path."),
      pointer(files.managedProductUpdateScript, "Managed update path."),
      pointer(files.kfd2ReleaseClaims, "Public trust claim path."),
    ],
    manuals: [
      pointer(files.readme),
      pointer(files.agents),
      pointer(files.docsMap),
      pointer(files.kungfuGuiCaskGuide),
      pointer(files.kungfuCliFormulaGuide),
      pointer(files.contributing),
      pointer(files.kfdReadme),
    ],
  },
  closure: {
    classificationMode: "closed-world",
    reachableEntrypoints: minimalEntrypoints.map((entry) => entry.id),
    classifiedEntrypoints: minimalEntrypoints.map((entry) => entry.id),
    unclassifiedEntrypoints: [],
    declaredFiles,
  },
  result: "pass",
  residualRisk: [],
};

writeJson(files.kfd3Witness, kfd3Witness);

console.log(`updated ${path.relative(cwd, outDir)}`);
