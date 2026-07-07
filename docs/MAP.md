# Documentation Map

| Question | Start here |
| --- | --- |
| How do I install Buildchain with Homebrew? | [`README.md`](../README.md) |
| How is tap metadata checked? | [`scripts/check-tap.mjs`](../scripts/check-tap.mjs) and [`tap-manifest.json`](../tap-manifest.json) |
| How does Buildchain manage this repository? | [`buildchain.toml`](../buildchain.toml) |
| How do I contribute? | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| How do I report a vulnerability? | [`SECURITY.md`](../SECURITY.md) |

## Repository Shape

```text
Formula/              Homebrew formulae
tap-manifest.json     Machine-readable distribution index
scripts/check-tap.mjs Drift check for formulae and upstream release evidence
buildchain.toml       Buildchain lifecycle declaration
```

## Fact Boundary

The tap is not the upstream release authority. Each tap entry points to an
upstream release passport or equivalent release evidence. Agents should inspect
the upstream passport first, then the formula.
