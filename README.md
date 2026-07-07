# Kungfu Systems Homebrew Tap

[![Buildchain Validate](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/buildchain-validate.yml/badge.svg)](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/buildchain-validate.yml)
[![Tap Check](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/tap-check.yml/badge.svg)](https://github.com/kungfu-systems/homebrew-tap/actions/workflows/tap-check.yml)
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

## Read Next

- [Documentation map](docs/MAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
