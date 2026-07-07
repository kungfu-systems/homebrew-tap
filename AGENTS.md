# AGENTS.md

This repository is a public Homebrew tap for Kungfu Systems release artifacts.
It is a router for agents and people; it does not duplicate the full release
process.

## What this repository does

- Publishes Homebrew formulae and casks under `kungfu-systems/tap`.
- Binds each entry to upstream release evidence.
- Uses Buildchain checks to keep tap metadata from drifting away from upstream
  release passports.

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

When this file and a source-of-truth document disagree, follow
[`docs/MAP.md`](docs/MAP.md) for routing and the checked manifest files for
machine-readable facts.
