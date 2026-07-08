# Kungfu Systems Homebrew Tap

[![Buildchain Validate](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/buildchain-validate.yml/badge.svg)](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/buildchain-validate.yml)
[![Tap Check](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/tap-check.yml/badge.svg)](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/tap-check.yml)
[![Managed Product Updates](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/managed-product-updates.yml/badge.svg)](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/managed-product-updates.yml)
[![KFD-1](https://img.shields.io/badge/KFD--1-supported-brightgreen.svg)](kfd/kfd-1.witness.json)
[![KFD-2](https://img.shields.io/badge/KFD--2-supported-brightgreen.svg)](kfd/kfd-2.release-claims.json)
[![KFD-3](https://img.shields.io/badge/KFD--3-supported-brightgreen.svg)](kfd/kfd-3.witness.json)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

This repository is the Homebrew tap for Kungfu Systems tools and applications.
It is a distribution index: formulas and casks point to release artifacts that
are owned and verified by their upstream repositories.

## Install

```sh
brew install kungfu-systems/tap/buildchain
```

or:

```sh
brew tap kungfu-systems/tap
brew install buildchain
```

## Current Formulae

| Formula | Upstream | Evidence |
| --- | --- | --- |
| `buildchain` | `kungfu-systems/buildchain` | [`buildchain.release.json`](https://github.com/kungfu-systems/buildchain/releases/latest/download/buildchain.release.json) |

## Release Evidence

Tap entries are checked against machine-readable upstream evidence. For
Buildchain, the tap records:

- upstream repository and release tag;
- release passport URL;
- binary archive URLs;
- SHA-256 digests;
- KFD-1 / KFD-2 / KFD-3 passport status.

The tap does not replace upstream release passports. It projects them into
Homebrew installation metadata.

## Buildchain Management

This tap uses Buildchain's floating `@v2` runtime with
`buildchain.contract-lock.json`. CI checks the accepted Buildchain runtime
contract before running tap verification, so compatible runtime movement is
visible and breaking contract drift fails before lifecycle work proceeds.

Managed product updates are projected from upstream release passports:

```sh
node scripts/update-managed-products.mjs --check --update-lock
node scripts/update-managed-products.mjs --write --update-lock
```

The scheduled workflow uses the same script and opens an automation pull
request when formulae, `tap-manifest.json`, or the compatible Buildchain
runtime lock move. It then enables GitHub auto-merge for that PR, so routine
managed updates land after repository requirements pass.

## KFD Support

The tap has its own KFD support in [`kfd/`](kfd/):

- KFD-1 declares the tap distribution fact world and witness.
- KFD-2 declares public trust claims for upstream release evidence, the
  Buildchain runtime lock, and tap-local KFD support.
- KFD-3 declares the participant-facing collaboration interface and verifies
  that public control surfaces are closed-world classified.

`node scripts/check-tap.mjs` rejects stale KFD hashes and undeclared scripts,
workflows, formulae, manuals, or KFD surfaces.

## Read Next

- [Documentation map](docs/MAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
