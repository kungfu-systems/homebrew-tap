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
node scripts/check-tap.mjs
git diff --check
```

If Buildchain is installed:

```sh
buildchain validate --require-lifecycle-stages verify
buildchain lifecycle run verify --required
```

## Formula Rules

- `Formula/*.rb` must match `tap-manifest.json`.
- URLs must point to upstream release assets.
- SHA-256 values must match upstream release passport or GitHub Release asset
  digests.
- A tap entry may not claim KFD status that the upstream release passport does
  not verify.

## Pull Requests

PRs should describe:

- which package entry changed;
- which upstream release passport was used;
- what local checks were run;
- whether credentials, provider APIs, hosted services, package names, or release
  evidence surfaces are affected.
