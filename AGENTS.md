# AGENTS.md

This repository is a public Homebrew tap for Kungfu Systems release artifacts.
It is a router for agents and people; it does not duplicate the full release
process.

## What this repository does

- Publishes Homebrew formulae and casks under `kungfu-systems/tap`.
- Binds each entry to upstream release evidence.
- Uses Buildchain checks to keep tap metadata from drifting away from upstream
  release passports.
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

The `Tap Check` workflow calls Buildchain's reusable workflow, which checks this
lock before running the tap lifecycle verification.

Regenerate tap-local KFD witnesses after changing a formula, workflow, script,
public manual, or KFD file:

```sh
node scripts/update-kfd-witnesses.mjs
node scripts/check-tap.mjs
```

When this file and a source-of-truth document disagree, follow
[`docs/MAP.md`](docs/MAP.md) for routing and the checked manifest files for
machine-readable facts.
