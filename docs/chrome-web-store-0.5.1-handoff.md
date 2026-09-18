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
| Local preparation | Automated validation and archive audit complete; manual owner acceptance pending |
| External update actions | No upload, review submission or publication performed |

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

All checks below are **pending owner verification**. A prepared checklist is
not evidence that Chromium's native permission dialog has been exercised.

- [ ] On an ordinary HTTPS page without previously granted site access, click
  the StepScript toolbar icon, then **Iniciar Gravação**; approve the native
  site-access prompt and confirm **Status: Gravando** and captured steps.
- [ ] Stop recording, keep the Side Panel open, and navigate within the same
  origin. Starting again must use the current URL, including its path or hash.
- [ ] While stopped with existing steps, switch tabs and try to start. Confirm
  the accessible message **Reabra o StepScript pelo ícone na aba que deseja
  gravar.** and that the stopped state and existing steps are unchanged.
- [ ] Return to the original tab without clicking the icon. Starting must still
  be blocked; switching back must not silently restore authorization.
- [ ] Open StepScript again through its icon on the intended tab and confirm
  recording can start normally. A successful new recording retains the existing
  product behavior of starting a fresh flow.
- [ ] While stopped, change to another origin or close the authorized tab.
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
acceptance of native toolbar interaction and first-time site consent remains
pending. The update has not been uploaded or submitted; do not report manual
acceptance or Chrome Web Store approval from these automated results.

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
6. Stop with the update prepared as a draft. Upload, review submission and
   publication are subsequent owner actions; none was performed by this release.

The previous first-submission instructions in
[`chrome-web-store-draft-handoff.md`](chrome-web-store-draft-handoff.md) describe
historical preparation of 0.5.0. Use this document for the 0.5.1 update.
