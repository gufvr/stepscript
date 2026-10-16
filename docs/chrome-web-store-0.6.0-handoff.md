# StepScript 0.6.0 Web Store package handoff

## Release decision

The guided recording mode is an additive, optional feature alongside the
existing recorder. It is classified as a minor update under the release policy:
0.5.1 → 0.6.0. This release does not change extension permissions or recording
schemas.

## Package

| Field | Value |
| --- | --- |
| Package | `stepscript-releases/stepscript-extension-v0.6.0.zip` |
| SHA-256 | `81ed0efcf4f70545c88829a9984360f9601e6f234552101256bc19954f4f16bd` |
| ZIP entries | 20 |
| Manifest | StepScript, Manifest V3, version 0.6.0, at ZIP root |
| Minimum Chrome | 116 |
| Permissions | `activeTab`, `scripting`, `sidePanel`, `storage`, `webNavigation` |
| Package audit | Passed: required files and local HTML references verified |

The preceding `stepscript-releases/stepscript-extension-v0.5.1.zip` was moved
from the repository root without modification. Its SHA-256 remains
`4f8e76dd12bcc1ecf27a9a132afdb295c2dc767a144f385aec25b77f4c5c8584`.

## Validation evidence

- `npm test -- --maxWorkers=2 --reporter=dot`: 75 files and 537 tests passed.
- `npm run lint`: passed.
- `npm run package:extension`: production build and ZIP verification passed;
  20 entries, manifest version 0.6.0.
- The guided recording handoff records the feature's focused and extension E2E
  results: `docs/guided-recording-handoff.md`.
- The package ZIP was moved into `stepscript-releases`; its SHA-256 was checked
  after the move.

## Chrome Web Store notes

Suggested “What's new” text:

> Add optional guided recording with live step feedback, pause and resume, and
> visual review of captured elements. Existing recording remains unchanged.

The ZIP is prepared locally only. It has not been uploaded, submitted for
review, or published. No commit or push was made.
