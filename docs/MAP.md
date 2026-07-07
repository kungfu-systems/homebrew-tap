# Documentation Map

| Question | Start here |
| --- | --- |
| How do I install Buildchain with Homebrew? | [`README.md`](../README.md) |
| How is tap metadata checked? | [`scripts/check-tap.mjs`](../scripts/check-tap.mjs) and [`tap-manifest.json`](../tap-manifest.json) |
| How does Buildchain manage this repository? | [`buildchain.toml`](../buildchain.toml) |
| How is the floating Buildchain runtime pinned? | [`buildchain.contract-lock.json`](../buildchain.contract-lock.json) and [`tap-check.yml`](../.github/workflows/tap-check.yml) |
| How do I contribute? | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| How do I report a vulnerability? | [`SECURITY.md`](../SECURITY.md) |

## Repository Shape

```text
Formula/              Homebrew formulae
tap-manifest.json     Machine-readable distribution index
scripts/check-tap.mjs Drift check for formulae and upstream release evidence
buildchain.toml       Buildchain lifecycle declaration
buildchain.contract-lock.json
                      Accepted Buildchain @v2 runtime contract lock
```

## Fact Boundary

The tap is not the upstream release authority. Each tap entry points to an
upstream release passport or equivalent release evidence. Agents should inspect
the upstream passport first, then the formula.

The Buildchain floating runtime is also not accepted blindly. The tap records
the reviewed `@v2` runtime contract in `buildchain.contract-lock.json`; CI
checks that contract before running repository lifecycle verification.
