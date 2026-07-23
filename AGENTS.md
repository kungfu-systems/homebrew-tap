# AGENTS.md

This repository is a public Homebrew tap for Kungfu Systems release artifacts.
It is a router for agents and people; it does not duplicate the full release
process.

## What this repository does

- Publishes Homebrew formulae and casks under `kungfu-systems/tap`.
- Binds each entry to upstream release evidence.
- Uses Buildchain checks to keep tap metadata from drifting away from upstream
  release passports.
- Provides a managed updater that projects upstream release passports into
  formula, cask, manifest, and compatible Buildchain `@v2` lock changes.
- Declares tap-local KFD-1 / KFD-2 / KFD-3 support under [`kfd/`](kfd/).

## Where to start

- To install a package, read [`README.md`](README.md).
- To understand repository structure and checks, read [`docs/MAP.md`](docs/MAP.md).
- To contribute a formula, read [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Build and verify

```sh
node scripts/check-tap.mjs
```

Buildchain owns the repository-level lifecycle declaration:

```sh
buildchain validate --require-lifecycle-stages verify
buildchain lifecycle run verify --required
```

The tap uses the floating Buildchain `@v2` runtime only with a checked consumer
contract lock:

```sh
buildchain.contract-lock.json
```

The private zero-dependency `package.json` pins `pnpm@11.7.0` for Buildchain
consumer detection and its isolated runtime bootstrap only. Do not add
dependencies, a lockfile, or require an install step for the repository's
direct Node verification scripts.

The `Tap Check` workflow calls Buildchain's reusable workflow, which checks this
lock before running the tap lifecycle verification.

Check or apply managed product updates:

```sh
node scripts/update-managed-products.mjs --check --update-lock
node scripts/update-managed-products.mjs --write --update-lock
```

Prepare or materialize the Kungfu GUI App cask only through the planned-entry
path documented in [`docs/KUNGFU-GUI-CASK.md`](docs/KUNGFU-GUI-CASK.md).
Prepare or materialize the standalone Kungfu CLI Formula only through
[`docs/KUNGFU-CLI-FORMULA.md`](docs/KUNGFU-CLI-FORMULA.md); the shared
`kungfu` token requires `--type formula` or `--type cask`.

The `Managed Product Updates` workflow runs the write path, opens an automation
pull request, and enables GitHub auto-merge when managed formulae, casks,
`tap-manifest.json`, KFD witnesses, or the compatible Buildchain runtime lock
change.

Regenerate tap-local KFD witnesses after changing a formula, workflow, script,
public manual, or KFD file:

```sh
node scripts/update-kfd-witnesses.mjs
node scripts/check-tap.mjs
```

When this file and a source-of-truth document disagree, follow
[`docs/MAP.md`](docs/MAP.md) for routing and the checked manifest files for
machine-readable facts.
