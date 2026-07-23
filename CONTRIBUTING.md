# Contributing

Thank you for improving the Kungfu Systems Homebrew tap.

## Requirements

- Use lightweight Conventional Commits, such as `feat(tap): add kfd formula`.
- Sign off commits with the Developer Certificate of Origin:

  ```sh
  git commit -s
  ```

- Do not include secrets, credentials, private logs, or unpublished provider
  data.
- Keep every formula or cask bound to upstream release evidence.

## Local Checks

```sh
node scripts/update-managed-products.mjs --check --update-lock
node scripts/check-tap.mjs
git diff --check
```

To update managed entries from upstream release passports:

```sh
node scripts/update-managed-products.mjs --write --update-lock
node scripts/update-kfd-witnesses.mjs
node scripts/check-tap.mjs
```

The `kungfu` token is shared by a planned CLI Formula and GUI Cask. Always
select the entry type explicitly:

```sh
node scripts/update-managed-products.mjs \
  --package kungfu \
  --type formula \
  --release-passport <exact-kungfu-release-passport-url>
```

To materialize the planned Kungfu GUI App cask, follow
[`docs/KUNGFU-GUI-CASK.md`](docs/KUNGFU-GUI-CASK.md). Do not add
`Casks/kungfu.rb` by hand without moving the manifest entry from
`plannedEntries` into installable `entries` through the managed updater.

After changing a formula, workflow, script, public manual, or tap KFD file,
regenerate KFD witnesses before checking:

```sh
node scripts/update-kfd-witnesses.mjs
node scripts/check-tap.mjs
```

If Buildchain is installed:

```sh
buildchain validate --require-lifecycle-stages verify
buildchain lifecycle run verify --required
```

CI also verifies `buildchain.contract-lock.json` before the lifecycle check.
The private zero-dependency `package.json` exists only to declare
`npm@11.7.0` to Buildchain's package-manager trust gate; local checks do not
require `npm install`.
When Buildchain `@v2` advances, the managed updater may refresh the lock only
when the compatibility digest still matches the accepted major-compatible
policy; incompatible drift fails closed.

Managed update pull requests are automation-owned. The workflow enables
auto-merge after it regenerates the formula, manifest, lock, and KFD witnesses
and runs the local tap checks. Non-automation PRs still follow normal review.

## Formula and Cask Rules

- `Formula/*.rb` must match `tap-manifest.json`.
- `Casks/*.rb` must match `tap-manifest.json`.
- URLs must point to upstream release assets.
- SHA-256 values must match upstream release passport or GitHub Release asset
  digests.
- A tap entry may not claim KFD status that the upstream release passport does
  not verify.
- Planned cask entries are not installable. `scripts/check-tap.mjs` rejects a
  planned entry that has already created a `Casks/*.rb` file.
- Participant-facing control surfaces must be declared in the tap-local KFD-3
  collaboration interface.

## Pull Requests

PRs should describe:

- which package entry changed;
- which upstream release passport was used;
- what local checks were run;
- whether credentials, provider APIs, hosted services, package names, or release
  evidence surfaces are affected.
