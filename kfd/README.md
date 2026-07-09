# Tap KFD Claims

This directory contains the tap-local KFD support files. The tap still projects
upstream release evidence; it does not become the upstream artifact authority.

| Standard | File | Purpose |
| --- | --- | --- |
| KFD-1 | `kfd-1.contract-world.json` | Declares the tap distribution fact world. |
| KFD-1 | `kfd-1.witness.json` | Binds declared tap fact surfaces to repository files and hashes. |
| KFD-2 | `kfd-2.release-claims.json` | Declares public trust claims for tap metadata, Buildchain runtime lock, and tap-local KFD support. |
| KFD-3 | `kfd-3.collaboration-interface.json` | Declares the participant-facing collaboration interface for installers, agents, maintainers, and release systems. |
| KFD-3 | `kfd-3.witness.json` | Proves the collaboration interface has closed-world entrypoint classification. |

Regenerate the files after changing a formula, cask, workflow, script, public
manual, or tap KFD surface:

```sh
node scripts/update-kfd-witnesses.mjs
node scripts/check-tap.mjs
```

`scripts/check-tap.mjs` rejects stale KFD hashes, undeclared
participant-facing control surfaces, and planned cask entries that accidentally
become installable.
