---
status: active
period: ongoing
theme: repository-artifact-versioning
doc_type: decision-record
source_level: repository-contracts
confidence: high
sensitivity: public
evidence_grade: B
review_state: unreviewed
last_reviewed: 2026-09-07
---

# Repository Artifact Versioning

`repository.release.json` anchors the repository artifact version. Buildchain
checks it against `package.json` with the anchored/manual strategy. Maintainers
review each version change and promote `main` through an alpha channel pull
request. Exact tags, release assets and their digests are immutable.

## Decision Log

- 2026-09-07: Open the initial `v0.1` repository artifact line at
  `0.1.0-alpha.1`. This introduces a versioned source archive and release evidence.
  Existing Homebrew installation contracts and upstream product version selection
  remain unchanged. Future compatibility decisions follow the registered
  consumer contracts; a new repository snapshot does not imply an upstream
  product release or infrastructure deployment.
