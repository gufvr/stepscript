# StepScript listing assets — Store 1D.3A

These files are prepared for manual review and later upload. They are not part of
the extension package. No dashboard changes or submission are performed here.

## Deliverables

| File | Format / size | Purpose and origin |
| --- | --- | --- |
| `01-recording.png` | PNG, 1280x800 | Real recording status, captured form interaction and selectors |
| `02-steps-and-checks.png` | PNG, 1280x800 | Real visibility/text checks, step editing/reordering controls and feedback |
| `03-generated-code.png` | PNG, 1280x800 | Real Playwright preview, copy/download controls and successful download feedback |
| `small-promo-440x280.png` | PNG, 440x280 | Brand artwork rendered from local HTML/CSS: capture, steps, code |

The screenshot source is the existing built extension's `index.html`, opened at
its extension URL in isolated persistent Chromium. This is the same application
used by the Side Panel, rendered at 1280x800; it is not a screenshot of Chrome's
native docked panel or its toolbar. No application CSS, DOM content, labels or
recorded steps are fabricated for the screenshots. Scrolling selects the visible
area. All interface text remains in Portuguese.

The recorder captures actual interactions against
[`source/fixture.html`](source/fixture.html) on `http://127.0.0.1:4176/fixture.html`.
The only entered value is the fictional name `Alex Demo`; the result message is
`Cadastro de demonstração salvo`. Visibility and exact-text checks are selected
through the real interface. Description editing and moving a step are exercised
through their real buttons before capture. No real website, user account or
personal test data is used. The existing author credit is product attribution.

Only a temporary build copy under ignored `test-results/store-assets` grants the
fixture origin in advance, following the existing extension E2E technique. The
production manifest and build are unchanged. A session-context bridge identifies
the fixture tab, and no steps are seeded into storage. Temporary browser profiles,
downloads and browser binaries stay in `test-results`.

The third screenshot shows Playwright. Both generators are exercised and their
downloaded contents are verified against their actual previews, without executing
the tests. It does not claim simultaneous previews. The recorded order includes
the demonstrated move and description edit.

## Promotional artwork

[`source/promo.html`](source/promo.html) is the editable artwork source. It uses
the existing `public/icons/icon-128.png` unchanged, Poppins from the existing local
dependency, a dark graphite/purple palette, and simple browser/steps/code symbols.
Only the StepScript name appears as text. The tile is promotional illustration,
not a simulated extension screenshot. It is rendered directly to PNG without
external fonts, assets, network services or image generation.

## Reproduction and evidence

From the project root, with dependencies and Playwright Chromium already available:

```powershell
npm run package:extension
node scripts/capture-store-assets.mjs
```

If Chromium is installed in the isolated workspace location instead of the
standard Playwright cache, set this environment variable for both installation
and capture:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'test-results/store-assets/browsers'
npx playwright install chromium
node scripts/capture-store-assets.mjs
```

Port 4176 must be free. Capture regenerates the four named PNGs and the evidence
file. Each run creates its own ignored temporary profile and unpacked copy.
[`capture-evidence.json`](capture-evidence.json) records the actual date, Chromium
version, source manifest/icon/ZIP hashes, capture surface and PNG hashes. Rebuild
the package before future captures when product code changes.

## Review checklist

- [x] Three screenshots are genuine extension renders with no added borders or padding.
- [x] Screenshots are PNG 1280x800; the tile is PNG 440x280.
- [x] Existing icon and product source files are preserved.
- [x] Screenshots contain fictional form data, not real personal test values.
- [x] Portuguese UI, product name and current features match the listing disclosures.
- [x] Visibility/text checks and generated-code controls are represented.
- [x] Playwright/Cypress downloads match their actual previews.
- [x] Listing PNG bytes are absent from `dist` and `stepscript-extension.zip`.
- [ ] Author approves the final visual set before dashboard entry.
- [ ] Preview screenshots at 640x400 and the tile at 220x140 to check store-size readability.
- [ ] After creating the unpublished Dashboard draft, confirm required fields, including video, before submission.

To review, open the four PNGs at native size, then at half size. Check visible
labels, spelling, fictional values, selectors and code. Compare the screenshots
with the unpacked extension; the wide direct application surface is documented
above. Confirm the existing icon works on light and dark backgrounds in a later
icon review; this release does not change it.

## Store 1D.3B final asset review

Reviewed on September 16, 2026 against the current source manifest, icon, built
extension and the hashes in `capture-evidence.json`. The asset set is **approved
for author review**, subject to the dashboard video decision below. This is not a
publication approval or a claim that Chrome Web Store review has approved it.

| Asset | Native-size review | Reduced-size review | Decision |
| --- | --- | --- | --- |
| `01-recording.png` | Brand, recording state, count, privacy disclosure and main actions are clear. The fictional `Alex Demo` value and selector remain visible. | Status, count and main actions remain clear. Fine selector/action detail is secondary at this scale. | Approved |
| `02-steps-and-checks.png` | The visibility and exact-text assertions, selectors, edit/reorder/delete controls and feedback are legible. | Assertion descriptions and controls remain distinguishable; selector detail benefits from opening at native size. | Approved |
| `03-generated-code.png` | The Playwright title, export summary, visible generated code and copy/download result are clear. | The code block communicates the export surface; its individual source lines require native-size inspection. | Approved |
| `small-promo-440x280.png` | StepScript name, icon and capture-to-steps-to-code sequence have strong contrast on the dark graphite background. | The name and three symbols remain recognizable at 220x140. | Approved |

The wide direct-extension surface is faithful to the application and disclosed in
this handoff. A future browser-window or docked-panel capture could be considered
as a promotional preference, but it is not required for this asset set. No
recapture, visual correction or product change is required from this review.

Fidelity checks pass: capture evidence ties the screenshots to the current
manifest and unchanged icon hashes; the capture script uses the real extension,
real recorder, real assertion picker, real edit/reorder controls and real code
previews/downloads. The fixture supplies only `Alex Demo` and a synthetic
Portuguese confirmation message. The visible footer author credit is existing
product attribution, not test data. No account, email address, address, payment
data, credential, token or external-page content appears in the reviewed set.

### Dashboard video requirement

**Decision: pending owner confirmation.** The Chrome Web Store Developer
Dashboard is an authenticated external surface and no authenticated Dashboard
browser context is available to this review. No Dashboard field was opened,
changed or saved. The official sources still conflict: the dedicated image guide
says the icon, small promo image and one screenshot are mandatory, while the
dashboard listing guide includes a YouTube video in its required-assets wording.

After creating the unpublished item draft, and before submission, the owner should
open **Store listing** and inspect the Graphic assets section without uploading
additional assets or saving listing fields. Record one of these exact outcomes here:

| Dashboard observation | Required follow-up |
| --- | --- |
| Video field has no required marker and the form accepts the three screenshots, icon and small tile as complete | Mark video as not required and keep this asset set approved. |
| Video field has a required marker or blocks form completion without a YouTube URL | Plan a separate video-only release before submission. |
| Dashboard wording or validation is unclear | Capture the field label or validation text for review; do not guess or submit. |

The owner review and post-draft Dashboard observation are the only remaining 1D.3B
gates. Creating the draft is a separate external release and does not publish the
extension.

## Official requirements and remaining handoff

The [dedicated image requirements](https://developer.chrome.com/docs/webstore/images)
require an icon, small promotional image and at least one screenshot; permit one
to five screenshots at 1280x800 or 640x400, prefer the larger size, and require
square corners without padding. A marquee image is optional at 1400x560. This
release supplies three screenshots and a small tile; the existing packaged
128x128 icon is reused.

The [dashboard listing guide](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
uses wording that also treats video as required, while the dedicated image page
lists only the icon, small tile and screenshot as mandatory. Confirm the actual
Dashboard requirement before declaring the listing ready. Video and marquee
production are deferred; no dashboard access is performed in this release.

Official references checked September 16, 2026. Metadata and review instructions
remain in [`../chrome-web-store-listing.md`](../chrome-web-store-listing.md).
