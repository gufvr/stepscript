# StepScript 0.5.1 update handoff — Store 1F

Prepared locally on September 17, 2026, against HEAD `51f8a74` and the existing
uncommitted recording-start hotfix. The owner previously supplied evidence that
StepScript 0.5.0 was published publicly. This release prepares an update for that
same item; its current Dashboard state has not been inspected in this run.

| Record | Value |
| --- | --- |
| Existing Store item ID | `kjapjhhghfigfilijhbdlchgpiojidhd` |
| Public listing | https://chromewebstore.google.com/detail/stepscript/kjapjhhghfigfilijhbdlchgpiojidhd |
| Local production build | `dist/` at the current project root |
| Target version | 0.5.1 |
| Local preparation | Automated validation and archive audit complete; manual owner acceptance reported passed |
| External update actions | Owner-authorized upload, review submission and publication of 0.5.1 reported completed |

The production source and built manifests were checked before validation: both
show StepScript 0.5.1, minimum Chrome version 116, and the original permissions
`activeTab`, `scripting`, `sidePanel`, `storage`, `webNavigation`, with optional
host permissions `http://*/*` and `https://*/*`. No production file is changed by
Store 1F. Existing local edits and the previous submission handoff are preserved.

## Manual acceptance checklist

Use a separate Chrome test profile with the production `dist` directory loaded
unpacked. Do not load the test copy that pre-grants fixture host access. Identify
the unpacked 0.5.1 item explicitly so the installed Store 0.5.0 copy is not the
one being tested. Use fictional form data.

All checks below were **reported passed by the owner** on September 17, 2026,
using `https://play-qa.com`. This is owner-reported manual evidence, not a browser
session directly observed by the agent.

- [x] On an ordinary HTTPS page without previously granted site access, click
  the StepScript toolbar icon, then **Iniciar Gravação**; approve the native
  site-access prompt and confirm **Status: Gravando** and captured steps.
- [x] Stop recording, keep the Side Panel open, and navigate within the same
  origin. Starting again must use the current URL, including its path or hash.
- [x] While stopped with existing steps, switch tabs and try to start. Confirm
  the accessible message **Reabra o StepScript pelo ícone na aba que deseja
  gravar.** and that the stopped state and existing steps are unchanged.
- [x] Return to the original tab without clicking the icon. Starting must still
  be blocked; switching back must not silently restore authorization.
- [x] Open StepScript again through its icon on the intended tab and confirm
  recording can start normally. A successful new recording retains the existing
  product behavior of starting a fresh flow.
- [x] While stopped, change to another origin or close the authorized tab.
  Starting from the remaining panel must be blocked until a new toolbar action
  establishes context on the desired tab.

Record the Chrome version, verification date and results here after completing
these checks. Native toolbar interaction and permission consent remain manual:
automated extension tests use the real extension page opened by
`chrome-extension://`, not the docked native Side Panel.

## Automated validation and archive evidence

| Check | Result |
| --- | --- |
| Full suite: `npm test -- --maxWorkers=2` | PASS: 61 files, 481 tests, 116.60 seconds |
| `npm run lint` | PASS |
| Build via `npm run test:extension` | PASS: TypeScript, both Vite builds and classic-recorder check |
| `npm run test:extension` | PASS: 2 Chromium scenarios, 10.4 seconds |
| Exported Playwright specs | PASS: 7 Chromium specs, 9.8 seconds |
| Exported Cypress specs | PASS: 7 specs / 7 tests in headless Electron 138, Cypress 15.21.1; `npm run test:exported` exited 0 |
| `npm run package:extension` | PASS: executed only after the full suite, lint, build, extension E2E and both export runners passed |
| Final ZIP audit and SHA-256 | PASS: 20 files, root manifest, exact source manifest and byte-for-byte equality with every file in `dist`; hash below |
| Branding contract after adding this handoff | PASS: 4 focused tests; this document introduces no legacy branding references |
| Final `git diff --check` | PASS |

The extension E2E scenarios cover recording across full navigation and stale
context rejection without pre-granted host access, including preservation of
existing records. The latter exercises the unmodified production manifest and
does not approve the native consent dialog. Export validation executes actual
generated specs against controlled fixtures, with no TODO steps accepted.

### Audited update archive

| Check | Verified result |
| --- | --- |
| ZIP path | `stepscript-extension.zip` at the current project root; use `Resolve-Path stepscript-extension.zip` for its absolute path |
| Archive size | 182595 bytes |
| SHA-256 | `4f8e76dd12bcc1ecf27a9a132afdb295c2dc767a144f385aec25b77f4c5c8584` |
| Manifest placement | `manifest.json` at the root; no enclosing `dist` directory |
| Manifest identity | Exact match with `public/manifest.json`; StepScript, 0.5.1, minimum Chrome 116 |
| Permissions | Original required and optional permissions above; no mandatory `host_permissions` grant |
| Essential files | Index, background, Side Panel, classic recorder, privacy HTML/CSS and 128px icon present; local manifest/HTML references valid |
| Archive/build identity | All 20 entry paths and uncompressed contents match the final production `dist` directory |
| Privacy policy | Packaged `privacy.html` matches the unchanged source bytes |
| Excluded files | No source, tests, test results, dependencies, handoff documents or Store listing assets included |

The project-root ZIP previously contained the local 0.5.0 archive and has been
regenerated as 0.5.1 by the approved packaging command. Its old audit remains in
the historical submission handoff. Rebuilding again can change ZIP metadata and
the SHA-256; repeat the archive audit and update this record after any rebuild.

Decision: **automated checks passed and the local archive is audited**. Manual
acceptance, including native toolbar interaction and first-time site consent,
was subsequently reported passed by the owner below. The owner subsequently
uploaded the update, as evidenced below; automated results do not establish
Chrome Web Store approval of 0.5.1.

## Release notes

```text
Fix recording start reliability when the Side Panel remains open across tab or safe URL changes.
```

## Owner-operated update instructions

1. Complete the manual acceptance checklist above and check the final local ZIP
   audit and hash below before uploading. Retain the currently published 0.5.0
   version until the update has been reviewed and separately published.
2. In the existing Chrome Web Store Developer Dashboard account, open the
   **StepScript** item with ID `kjapjhhghfigfilijhbdlchgpiojidhd`. Use the existing
   item rather than **Add new item**.
3. Choose **Fazer upload de um novo pacote** and select the exact audited
   `stepscript-extension.zip` at the project root. Confirm the resulting draft
   shows **0.5.1**, **StepScript**, and the permissions recorded above.
4. Preserve the approved listing, privacy answers, URLs, assets and distribution
   settings. Use only the short English release note above if the Dashboard
   provides an appropriate release-notes field; otherwise keep it in this handoff.
5. Save and reopen the draft to verify the new package version and inspect any
   validation messages. Record any upload error verbatim; do not change the
   product or permissions to work around it during this release.
6. Stop with the update prepared as a draft. The owner-authorized upload is now
   evidenced below. Review submission and publication remain subsequent actions.

The previous first-submission instructions in
[`chrome-web-store-draft-handoff.md`](chrome-web-store-draft-handoff.md) describe
historical preparation of 0.5.0. Use this document for the 0.5.1 update.

## Manual acceptance and upload follow-up

Archive reverified on September 17, 2026, at 22:05 -03:00, against current local
HEAD `53274df`. The existing ZIP was not rebuilt. Its SHA-256 exactly matches
the approved hash above; its 20-file package passes the structural/reference
validator. The root manifest contains StepScript 0.5.1 and the original required
and optional permissions, with no mandatory host grant, and matches both the
source and current production build manifests.

| Owner evidence gate | Current result |
| --- | --- |
| First-time native site authorization and successful recording | PASS, owner reported |
| Same-origin navigation uses the current URL | PASS, owner reported |
| Tab switch and switching back block stale starts without losing existing steps | PASS, owner reported |
| Cross-origin navigation blocks stale starts | PASS, owner reported |
| Authorized tab closure blocks stale starts | PASS, owner reported |
| New toolbar action restores recording on the intended tab | PASS, owner reported |
| Manual verification date / site | September 17, 2026 / https://play-qa.com |
| Browser version | Not supplied |
| Explicit confirmation at the upload action | Received: owner replied “Confirmo” before the upload |
| Existing item / draft version, name and permissions | Owner Package screenshot confirms StepScript, same item ID, draft 0.5.1 and original required permissions |
| Listing fields preserved after saving and reopening | PASS, owner replied “Tudo mantido” following the preservation and reopen checklist |
| Dashboard validation messages | No error shown on the supplied Package screenshot; other pages not inspected |

The owner replied that all checks passed, using `https://play-qa.com` instead of
the previously used practice site. The owner reported that the previous site
displayed a Netlify usage-limit suspension message. This availability issue was
not independently checked and is not an extension failure. The production build
and audited ZIP were not changed for this manual test-site substitution.

Upload evidence received on September 17, 2026, recorded at 22:37 -03:00. The
owner supplied the Package page for the existing item. Its draft column shows
version 0.5.1 and its published column still shows version 0.5.0. Both columns
list `activeTab`, `scripting`, `sidePanel`, `storage`, `webNavigation`; the header
shows StepScript and “Publicada - público”. That header describes the existing
published item, not publication of the 0.5.1 draft. The screenshot establishes
draft metadata, not a remote checksum or completion of review.

The owner subsequently replied “Tudo mantido” after being asked to check the
description, images, URLs and privacy fields, save any changes and reopen the
draft. Their confirmation closes the field-preservation gate; no additional
screenshots of those fields were supplied for this update.

Current stopping point: COMPLETE for manual acceptance and upload/draft validation.
Archive checks and owner-reported manual acceptance pass, the authorized owner
upload is evidenced, and field preservation is confirmed by the owner.
At that point, no 0.5.1 review submission or publication was evidenced. The
submission result is recorded below. The agent performed no external writes,
product modification, commit or push in this follow-up.

## Review submission preparation

Prepared on September 17, 2026, at 22:44 -03:00 using the owner's Package
screenshot and manual acceptance / preserved-field confirmations above.

| Submission record | Current result |
| --- | --- |
| Existing item / update | `kjapjhhghfigfilijhbdlchgpiojidhd` / StepScript 0.5.1 |
| Permissions | Original required permissions evidenced in the draft screenshot |
| Manual acceptance | Owner reported all cases passed |
| Preserved fields | Owner confirmed “Tudo mantido” |
| Blocking messages | None visible in the supplied Package screenshot; no later message supplied |
| Explicit submission authorization | Received: owner replied “Confirmo” before the action |
| Submission action | Owner replied “Prontinho!” after being instructed to submit with automatic publication unchecked |
| Publication choice | Owner was instructed to keep automatic publication unchecked; checkbox itself was not visible in the resulting status screenshot |
| Submission date and resulting status | Owner status screenshot at 22:50 -03:00 shows StepScript / same item ID / “Revisão pendente” |
| Update publication | No 0.5.1 publication evidenced; the resulting status is pending review |

After the owner explicitly authorizes **Enviar para análise**, guide them to
open its confirmation dialog on the existing StepScript item. Inspect any
validation messages and leave automatic publication unchecked if that option
is offered. If no deferred/manual option is available, record the actual dialog
and obtain direction before accepting automatic publication. After final send,
record the resulting review status and the confirmed publication choice from
the owner's evidence. Do not infer review completion or publication from the
existing item's published header.

The owner subsequently confirmed completing the action and supplied the resulting
Status screenshot. It shows StepScript, the existing item ID and “Revisão
pendente” on September 17, 2026, recorded at 22:50 -03:00. This confirms review
submission, not approval or publication. The automatic-publication checkbox was
not visible in that result screenshot; its recorded basis is the owner's execution
of the instruction to leave it unchecked.

Current stopping point: COMPLETE for Store 1F review submission. The 0.5.1
update is pending Chrome Web Store review. Wait for the Dashboard review outcome;
if approved, inspect the staged publication option and make a separate manual
publication decision.

## Published release outcome

On September 21, 2026, the owner reported that the StepScript item was published.
This closes the Store 1F update lifecycle for version 0.5.1. No publication
screenshot, exact publication timestamp or post-publication install check was
supplied, so this result is recorded as owner-reported external evidence.

| Release outcome | Recorded result |
| --- | --- |
| Version | StepScript 0.5.1 |
| Chrome Web Store status | Published, owner reported |
| Previous version | 0.5.0 was the version shown as published before the update review |
| Publication timing | September 21, 2026; exact time not supplied |
| Post-publication verification | Not supplied |
| Remaining release work | None; transition to normal maintenance |

The public listing remains
https://chromewebstore.google.com/detail/stepscript/kjapjhhghfigfilijhbdlchgpiojidhd.
Future work should begin as a separately scoped maintenance or feature release.
