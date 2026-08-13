# KFD Native Formula

The `kfd` Formula installs the Rust-native executable with the stable command
name `kfd`:

```sh
brew install kungfu-systems/tap/kfd
```

The Formula supports macOS and Linux on arm64 and x86_64. It does not install
the npm host. The native command intentionally exposes the offline `verify`
and `bundle` capability boundary; broader orchestration remains npm-host-only.

## Release evidence

Each Formula update is generated from one exact KFD release tag and binds:

- the exact KFD release passport and published version;
- the immutable GitHub Release digest for every native archive;
- one `kfd.native-release-provenance/v1` document per target;
- a common source tree across all four Homebrew targets;
- a clean Rust build and the exact `verify` / `bundle` capability boundary.

Update the Formula through the managed updater with an exact prerelease
passport URL:

```sh
node scripts/update-managed-products.mjs \
  --package kfd \
  --type formula \
  --release-passport <exact-kfd-buildchain.release.json-url> \
  --write
node scripts/update-kfd-witnesses.mjs
node scripts/check-tap.mjs
```

Do not point the Formula at a floating archive URL or rename the installed
binary for individual releases. The user-facing executable remains `kfd`.
