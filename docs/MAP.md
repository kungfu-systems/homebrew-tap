# Documentation Map

| Question | Start here |
| --- | --- |
| How do I install Buildchain with Homebrew? | [`README.md`](../README.md) |
| How will the standalone Kungfu CLI be published as a Formula? | [`docs/KUNGFU-CLI-FORMULA.md`](KUNGFU-CLI-FORMULA.md) |
| How will the Kungfu GUI App be published as a cask? | [`docs/KUNGFU-GUI-CASK.md`](KUNGFU-GUI-CASK.md) |
| How is tap metadata checked? | [`scripts/check-tap.mjs`](../scripts/check-tap.mjs) and [`tap-manifest.json`](../tap-manifest.json) |
| How are managed product versions updated? | [`scripts/update-managed-products.mjs`](../scripts/update-managed-products.mjs) and [`managed-product-updates.yml`](../.github/workflows/managed-product-updates.yml) |
| How does Buildchain manage this repository? | [`buildchain.toml`](../buildchain.toml) |
| How is the floating Buildchain runtime pinned? | [`buildchain.contract-lock.json`](../buildchain.contract-lock.json) and [`tap-check.yml`](../.github/workflows/tap-check.yml) |
| How does the tap support KFD-1/2/3? | [`kfd/README.md`](../kfd/README.md), [`kfd/kfd-1.witness.json`](../kfd/kfd-1.witness.json), [`kfd/kfd-2.release-claims.json`](../kfd/kfd-2.release-claims.json), and [`kfd/kfd-3.witness.json`](../kfd/kfd-3.witness.json) |
| How do I contribute? | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| How do I report a vulnerability? | [`SECURITY.md`](../SECURITY.md) |

## Repository Shape

```text
Formula/              Homebrew formulae
Casks/                Homebrew casks materialized from release passports
tap-manifest.json     Machine-readable distribution index
scripts/update-managed-products.mjs
                      Managed updater from upstream release passports
scripts/check-tap.mjs Drift check for formulae, casks, and upstream release evidence
.github/workflows/managed-product-updates.yml
                      Scheduled/manual update PR and auto-merge workflow
buildchain.toml       Buildchain lifecycle declaration
buildchain.contract-lock.json
                      Accepted Buildchain @v2 runtime contract lock
kfd/                  Tap-local KFD-1/2/3 claims and witnesses
```

## Fact Boundary

The tap is not the upstream release authority. Each installable tap entry
points to an upstream release passport or equivalent release evidence. Agents
should inspect the upstream passport first, then the formula or cask.

Planned formulae and casks are not installable. `tap-manifest.json` may describe
a future entry under `plannedEntries`, but `scripts/check-tap.mjs` rejects a
planned entry that creates its Formula or Cask file. An entry becomes valid
only after the managed updater materializes it into installable `entries` from
an exact upstream release passport.

The Buildchain floating runtime is also not accepted blindly. The tap records
the reviewed `@v2` runtime contract in `buildchain.contract-lock.json`; CI
checks that contract before running repository lifecycle verification.
The managed updater can refresh the lock only when the compatibility digest
matches the accepted major-compatible policy. Routine automation PRs are
auto-merged only through GitHub repository requirements; incompatible drift
does not produce an update PR.

The tap-local KFD files are generated from repository facts. `scripts/check-tap.mjs`
checks their hashes and closed-world file list so a new script, workflow,
formula, manual, or KFD surface cannot become an undeclared control surface.
