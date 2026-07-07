# Provider Compliance

This tap integrates with GitHub Releases and Homebrew.

Rules:

- Release assets must come from public upstream release pages.
- Formula and cask metadata must not depend on private sessions, cookies, or
  scraped provider state.
- Checks should use public release passport files, GitHub Release asset
  metadata, and Homebrew-compatible install tests.
- Provider-specific credentials must never be committed to this repository.

When an entry depends on a package registry or hosted service, document the
upstream evidence URL and keep provider attribution accurate.
