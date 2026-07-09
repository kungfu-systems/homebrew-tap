# Kungfu GUI App Cask Preparation

This tap is prepared to publish the Kungfu GUI macOS app as a Homebrew cask
after the upstream `kungfu-systems/kungfu` repository publishes a release
passport and a signed macOS DMG artifact.

The planned cask entry lives in `tap-manifest.json` under `plannedEntries`.
Planned entries are not installable and must not create `Casks/*.rb`. The entry
is materialized only when release evidence exists.

## Required upstream evidence

The upstream release passport must provide:

- `release.tag` and `release.publishedVersion`;
- `product.repository` or `upstream.repository` equal to `kungfu-systems/kungfu`;
- KFD-1, KFD-2, and KFD-3 status set to `passed`;
- one `darwin-arm64` DMG artifact with a SHA-256 digest;
- a canonical release passport asset named `kungfu.release.json`, or a manifest
  override for `upstream.releasePassportAsset`.

The DMG should contain `Kungfu.app`. Signing, notarization, and quarantine
behavior are owned by the upstream Kungfu release process and should be present
in the release passport before the cask is materialized.

## Materialize the cask

Run the managed updater with an explicit release passport:

```sh
node scripts/update-managed-products.mjs \
  --package kungfu \
  --release-passport https://github.com/kungfu-systems/kungfu/releases/download/<tag>/kungfu.release.json \
  --write \
  --update-lock
node scripts/update-kfd-witnesses.mjs
node scripts/check-tap.mjs
git diff --check
```

The updater will:

- move `plannedEntries[type=cask,name=kungfu]` into installable `entries`;
- write `Casks/kungfu.rb`;
- bind the cask URL and SHA-256 to the upstream release passport;
- keep the tap-local KFD-3 closed-world surface list aligned.

After that, users can install with:

```sh
brew install --cask kungfu-systems/tap/kungfu
```
