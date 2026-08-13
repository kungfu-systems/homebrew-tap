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
brew install kungfu-systems/tap/kfd
brew install kungfu-systems/tap/kungfu
```

Buildchain remains available from the same tap:

```sh
brew install kungfu-systems/tap/buildchain
```

## Current Formulae

| Formula | Upstream | Evidence |
| --- | --- | --- |
| `buildchain` | `kungfu-systems/buildchain` | [`buildchain.release.json`](https://github.com/kungfu-systems/buildchain/releases/latest/download/buildchain.release.json) |
| `kfd` | `kungfu-systems/kfd` | Exact release passport plus per-target native provenance. See [KFD Formula](docs/KFD-FORMULA.md). |
| `kungfu` | `kungfu-systems/kungfu` | Exact prerelease passport and standalone CLI archives. See [Kungfu CLI Formula](docs/KUNGFU-CLI-FORMULA.md). |

## Planned Casks

| Cask | Upstream | Status |
| --- | --- | --- |
| `kungfu` | `kungfu-systems/kungfu` | Prepared, not yet installable. See [Kungfu GUI App cask preparation](docs/KUNGFU-GUI-CASK.md). |

## Release Evidence

Tap entries are checked against machine-readable upstream evidence. For
Buildchain, the tap records:

- upstream repository and release tag;
- release passport URL;
- binary archive URLs;
- SHA-256 digests;
- KFD-1 / KFD-2 / KFD-3 passport status.

For KFD native archives, the tap additionally records each target's immutable
GitHub Release digest and `kfd.native-release-provenance/v1` document. The tap
does not replace upstream release evidence. It projects that evidence into
Homebrew installation metadata.

## Buildchain Management

This tap uses Buildchain's floating `@v3` runtime with
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

Planned casks stay out of the installable Homebrew surface until an upstream
release passport is provided explicitly. The Kungfu GUI App path is documented
in [docs/KUNGFU-GUI-CASK.md](docs/KUNGFU-GUI-CASK.md).

## KFD Support

The tap has its own KFD support in [`kfd/`](kfd/):

- KFD-1 declares the tap distribution fact world and witness.
- KFD-2 declares public trust claims for upstream release evidence, the
  Buildchain runtime lock, and tap-local KFD support.
- KFD-3 declares the participant-facing collaboration interface and verifies
  that public control surfaces, including future cask surfaces, are
  closed-world classified.

`node scripts/check-tap.mjs` rejects stale KFD hashes and undeclared scripts,
workflows, formulae, manuals, or KFD surfaces.

## Read Next

- [Documentation map](docs/MAP.md)
- [KFD Formula](docs/KFD-FORMULA.md)
- [Kungfu CLI Formula](docs/KUNGFU-CLI-FORMULA.md)
- [Kungfu GUI App cask preparation](docs/KUNGFU-GUI-CASK.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
