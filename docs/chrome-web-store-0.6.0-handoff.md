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

## Manual validation attempt — 2026-10-15

Checked at 22:41 (America/Sao_Paulo). Result: **BLOCKED / manual cases pending**.
No browser interaction or manual acceptance case was executed.

### Observed environment

- The browser connection returned `Browser is not available: chrome`; the
  connected browser list was empty.
- Installed-browser discovery returned Brave, Microsoft Edge and Vivaldi, but
  no Google Chrome. The Chrome user-data directory was not found. This is
  discovery evidence, not proof that Chrome cannot exist at another location.
- The Chrome native messaging host check reported a missing registry entry and
  native host manifest. The process-running check failed with access denied,
  so whether Chrome was running could not be established by that check.
- No browser was launched, installed or substituted, and no native host or
  profile was modified.

### Local artifact checks completed

- The ZIP SHA-256 still matches the hash above.
- The package validator again accepted all 20 entries and manifest 0.6.0.
- Every ZIP entry was compared byte-for-byte with its corresponding file in
  `dist/`: 20 matches, no differing files and no extra files in `dist/`.
- The local unpacked manifest declares StepScript 0.6.0 and the original
  permissions. This verifies build files, not installation in Chrome.

### Manual acceptance checklist

| Case | Result / evidence still needed |
| --- | --- |
| Chrome version, unpacked installation and opening the native Side Panel | Pending: Chrome unavailable through the browser connection |
| First site authorization and common recording | Pending: no browser interaction executed |
| Guided recording: click, ordinary fill, Tab, live step feedback and highlight without focus changes | Pending: no browser interaction executed |
| Fictional password recorded only as a protected value | Pending: no browser interaction executed |
| Pause/resume and no capture during pause | Pending: no browser interaction executed |
| Previous/next review highlights saved steps without executing actions | Pending: no browser interaction executed |
| Multistep form, dynamically removed/hidden element and same-origin navigation | Pending: no browser interaction executed |
| Tab/origin change, explicit recovery through the icon and tab closure | Pending: no browser interaction executed |
| Stop recording and inspect Playwright/Cypress exports | Pending: no browser interaction executed |

The prior automated evidence remains valid as recorded; it does not replace
these manual cases. Manual readiness for upload has **not** been approved.
Resume this checklist when the requested Chrome is connected with the unpacked
0.6.0 build. This attempt changed only this handoff: no product change, package
generation, upload, review submission, publication, commit or push occurred.

### Resumption attempt and setup — 2026-10-15, 22:43 -03:00

The owner authorized the actions necessary to proceed with manual validation.
A fresh Chrome connection attempt still returned `Browser is not available:
chrome`. Read-only checks found no `chrome.exe` under the standard machine-wide
or current-user Google Chrome installation paths. The native messaging check
again reported both its Chrome registry entry and shared manifest missing.

No supported Chrome browser session is available for the manual checklist.
No acceptance case was run or marked as passed. Existing package and automated
test evidence is unchanged; no additional test run was needed for this
connection diagnosis.

Setup needed before resumption:

1. Make Google Chrome available, or explicitly choose another supported browser
   and adjust the manual-validation target accordingly.
2. In the app's Settings → Computer use, install or reinstall the Browser
   connection and enable its ChatGPT extension in the chosen browser. The
   browser workflow requires native-host repair through the plugin UI rather
   than a hand-written registry or host installation.
3. Open the browser and load the unpacked extension from the repository's
   `dist/` directory, confirming StepScript 0.6.0. Keep any existing recordings;
   use fictional test data for this checklist.
4. Reconnect the browser, then resume the pending native Side Panel cases and
   record their actual outcomes before deciding readiness for upload.

Only this handoff was updated during this resumption attempt. No browser or
extension was installed or launched, and no package or external Store action
was performed.

### Owner evidence — Brave selected

The owner supplied a screenshot of the Brave extension manager showing
StepScript 0.6.0 enabled and a service-worker inspection link. Brave is now the
authorized browser for continuing this checklist. The screenshot confirms the
visible extension name, version and enabled state, but does not establish the
unpacked directory, Side Panel behavior or any acceptance case result.

The browser connection still listed no connected browsers and returned
`Browser is not available: brave`. The supported Brave extension diagnostic
could not locate its default user-data directory; this does not contradict the
owner's screenshot or establish that the extension is absent from their actual
profile. The native messaging diagnostic still reported the shared host
manifest and registry entry missing.

StepScript installation is evidenced; interactive browser access is not yet
available to the agent. The ChatGPT browser connection must be configured in
the owner's Brave session through Settings → Computer use. Do not reinstall
StepScript to address this separate connection issue. All functional manual
cases remain pending until browser access or owner-observed test results are
available. No external Store action was performed.

### Connection restored — 2026-10-15, 23:06 -03:00

After the owner configured the Brave browser connection in the desktop app,
the current VS Code session discovered and connected to Brave successfully.
The earlier connection blocker is resolved; no further installation is needed
based on this observation.

The agent opened `https://play-qa.com/forms#login` in a dedicated test tab,
rejected its optional analytics cookie and verified the visible login form.
No login data was entered or form submitted. The test tab was retained for
continuing the checklist. The browser tool refused control of the internal
extension-manager tab, and its documented tab interface provides no native
toolbar/Side Panel controls. Opening StepScript through its toolbar icon and
observing its native Side Panel therefore requires owner participation.
Functional acceptance cases remain pending; browser connectivity and page
preparation are not evidence that recording, highlighting or exports passed.
Full CDP access was not enabled. No Store action was performed.

### Owner-observed native Side Panel — 2026-10-15, 23:09 -03:00

The owner supplied a screenshot of the test form beside the native StepScript
Side Panel in Brave. It shows guided recording selected, `Status: Pausado`,
`7 passos capturados`, `Passo 7 de 7` and the description
`Clicou no botão "Entrar"`. Resume, review, previous-step and end controls are
visible; advance is disabled at the last step.

This is partial manual evidence that the native panel displays captured steps
and the paused guided state. It does not yet establish live update timing,
highlight behavior, password protection, no capture while paused, successful
resumption, review without replay, context-change handling or export results.
These acceptance checks remain pending. No product or Store action was made
while recording this evidence.
