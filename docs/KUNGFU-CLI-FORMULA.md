# Kungfu Standalone CLI Formula

The `kungfu` Formula is the Homebrew-owned installation path for the standalone
headless CLI. It is separate from the planned `kungfu` GUI Cask and never
installs Electron or `Kungfu.app`.

```sh
brew install kungfu-systems/tap/kungfu
```

## Publication gate

The Formula was materialized from the exact `v4.0.0-alpha.1`
`buildchain.release.json`, which provides:

- one exact release tag and published SemVer;
- macOS arm64 and Linux x86_64 `kungfu-episodes-cli-*.tar.gz` artifacts;
- exact SHA-256 digests for those archive names.

The passport reports KFD-1 and KFD-3 as `passed` and KFD-2 as `downgraded`.
The tap preserves those statuses verbatim under an explicit evidence policy;
installability is not presented as KFD certification.

Do not update `Formula/kungfu.rb` by hand. Move it through the managed updater
with an exact immutable passport URL:

```sh
node scripts/update-managed-products.mjs \
  --package kungfu \
  --type formula \
  --release-passport <exact-kungfu-release-passport-url> \
  --write
node scripts/update-kfd-witnesses.mjs
node scripts/check-tap.mjs
```

Alpha movement must pass an exact release-passport URL. The generic GitHub
`releases/latest` pointer is not used for the prerelease channel.

## Ownership and one-command update

The Formula installs the immutable CLI archive under Homebrew's `libexec`, then
projects a Homebrew-owned `product.json`. That manifest declares only these
trusted argument vectors:

```json
{
  "managerCommand": [
    "brew",
    "upgrade",
    "--formula",
    "kungfu-systems/tap/kungfu"
  ],
  "verificationCommand": [
    "kungfu",
    "--version"
  ]
}
```

`kungfu update` executes the argument array without shell interpolation and
verifies the selected target version afterward. Kungfu never writes the Cellar,
tap metadata, locks, or Homebrew prefix directly.

If Homebrew is unavailable, the Formula is missing, the tap is unreachable,
permissions prevent an upgrade, or version verification fails, the existing
installation remains owned by Homebrew and the command reports a stable reason
code. Retry the same command after repairing Homebrew. For an explicit rollback,
install a prior Formula version through Homebrew; do not copy files into the
Cellar.
