# StepScript Web Store releases

This folder contains only Chrome Web Store extension packages. Use the
versioned ZIP matching the update you intend to upload; do not upload an older
archive by mistake.

## Versioning

- Patch (`x.y.Z`): visual polish and low-impact changes.
- Minor (`x.Y.0`): fixes and focused features that preserve the core product.
- Major (`X.0.0`): substantial changes to the product's core behavior.

The guided recording mode is an additive, optional feature, so it advances
0.5.1 to 0.6.0 without changing the existing recording mode or permissions.

## Packages

| Version | Package | Notes |
| --- | --- | --- |
| 0.5.1 | `stepscript-extension-v0.5.1.zip` | Recording-start reliability fix; previously published. |
| 0.6.0 | `stepscript-extension-v0.6.0.zip` | Adds optional guided recording with live step feedback and visual review. |

See [`../docs/chrome-web-store-0.6.0-handoff.md`](../docs/chrome-web-store-0.6.0-handoff.md)
for package hashes, validation evidence, and the upload note.
