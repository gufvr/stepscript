# StepScript submission handoff — Store 1E.1 / 1E.2 / 1E.3

## Current state and approval

The owner confirmed the external draft-creation action and supplied screenshots
showing an existing StepScript item with package version 0.5.0. The owner has now
submitted it; the latest screenshot shows “Revisão pendente”. It is not approved
or published. Subsequent listing, privacy, asset and distribution screenshots
and the owner's save/reopen confirmation close the Store 1E.2 evidence gates.
Creation, uploads and saving approved fields are performed manually by the owner
in the existing developer account; no credentials are shared with the agent.
Store 1E.3 is complete: the owner explicitly authorized submission, supplied the
confirmation dialog with automatic publication unchecked, and then supplied the
resulting Pending review status. Publication is a separate owner decision.

| External record | Value |
| --- | --- |
| Owner confirmation | Received on September 16, 2026 |
| Draft item ID | `kjapjhhghfigfilijhbdlchgpiojidhd` |
| Draft dashboard URL | Available only in the authenticated owner session; not recorded here |
| Dashboard status | Revisão pendente / Pending review |
| Status page observation | Latest owner screenshot shows StepScript, the same item ID and “Revisão pendente” |
| Package version observed | 0.5.0 |
| Package type observed | Extension |
| Observed permissions | activeTab, scripting, sidePanel, storage, webNavigation |
| Publication status observed | Not published |
| Video requirement | Optional: the Dashboard field was shown without a required marker |
| Listing save result | Final screenshots reviewed; owner confirms fields were saved and reopened |
| Submit for review | Explicitly authorized and performed by the owner; result evidenced |
| Publication | Not authorized; not performed |

The owner supplied Dashboard screenshots of the Package and Status pages showing
the values above. The item code is the public Chrome extension identifier assigned
to this draft, not a credential. Do not record cookies, credentials, access tokens
or private account settings.

## Audited upload package

Prepared on September 16, 2026 (local date). `npm run package:extension` completed
successfully, rebuilding and auditing the production archive.

| Check | Verified result |
| --- | --- |
| Upload file | `stepscript-extension.zip` at the project root |
| ZIP size | 181893 bytes |
| ZIP SHA-256 | `dd8c51c4384e0d6ecd73f34cea6edb122ca3090332f7cd5744538ffc8ac57ba1` (Store 1E.2 rebuild) |
| Archive structure | 20 files; `manifest.json` at root; no enclosing `dist` directory |
| Package name | StepScript |
| Version | 0.5.0 |
| Minimum Chrome version | 116 |
| Summary | Exact approved English text; 80 characters |
| Manifest contract | Packaged manifest matches `public/manifest.json` exactly |
| Local policy and icon | Packaged bytes match their source files exactly |
| Listing PNGs | Original evidence hashes and required dimensions match; absent from ZIP |
| Production assets/code | Existing build verifier and package reference validator passed |

The historical Portuguese-description gate in
[`chrome-web-store-listing.md`](chrome-web-store-listing.md) is now resolved by
Store 1D.2; the uploaded manifest contains the English summary below. The current
interface is still Portuguese, as disclosed in the detailed description.

Rebuilding the ZIP can change its hash through archive metadata. If it is rebuilt
after this audit, audit again and update this table before uploading it. The old
ZIP hash in screenshot capture evidence describes that capture run, not the new
upload archive; asset, source manifest and icon hashes still match.

Store 1E.2 compared the SHA-256 of every uncompressed archive entry against the
pre-run archive (`dcf4fe7b80d2677efe88e5ec26b1293f4e6e22d36521a2f38ec19c1b50afa701`).
All 20 paths and file contents are identical; only archive metadata/order changed.
The Package screenshot proves the uploaded version and permissions, not the
uploaded archive hash. The local rebuild alone does not require another upload.

## Exact approved listing fields

| Dashboard field | Value or exact copy source |
| --- | --- |
| Name (package metadata) | StepScript |
| Summary (manifest description) | Record browser flows and generate readable Playwright and Cypress tests locally. |
| Detailed description | Copy only the `text` block under **Detailed description** in `chrome-web-store-listing.md` |
| Category | Developer Tools; confirm the dashboard label without substituting another category |
| Primary listing language | English (United States); confirm the dashboard label |
| Homepage | https://github.com/gufvr/stepscript |
| Support | https://github.com/gufvr/stepscript/issues |
| Privacy policy | https://gufvr.github.io/stepscript/privacy.html |
| Mature content | No, based on the existing product and reviewed assets |
| Test instructions | Use the approved 440-character Dashboard version under Store 1E.3 below; the actual field has a 500-character limit |
| Test credentials | None required; leave credential fields empty |
| Video / YouTube URL | Leave empty; supplied Dashboard evidence shows no required marker, and no approved video exists |
| Marquee promotional image | Optional; approved existing `marquee-promo-1400x560.png` is available |
| Verified publisher domain | Do not claim or configure one; repository homepage is not a verified domain |

Sources remain canonical: do not copy document headings, fences, audit commentary
or Markdown tables into the dashboard text fields. Name and summary are inherited
from the package rather than repaired through another manifest upload.

## Exact privacy-practices handoff

Use [`chrome-web-store-privacy.md`](chrome-web-store-privacy.md) for the full
approved permission justifications and certification wording.

Single purpose:

```text
Record user-initiated browser interactions locally and convert the recorded steps into Playwright or Cypress test code.
```

| Field | Approved source / answer |
| --- | --- |
| activeTab | Copy its **Permission justifications** subsection |
| scripting | Copy its **Permission justifications** subsection |
| sidePanel | Copy its **Permission justifications** subsection |
| storage | Copy its **Permission justifications** subsection |
| webNavigation | Copy its **Permission justifications** subsection |
| Host access | Copy **Optional host permissions**; access is requested only for the current site's origin |
| Remote code | No, I am not using remote code |
| Privacy policy URL | https://gufvr.github.io/stepscript/privacy.html |
| Data categories | Personally identifiable information, Web history / web browsing activity, User activity, Website content; Form data if separately offered |
| Usage certifications | Apply only the matching statements from **Data usage certifications**, using the dashboard's actual wording |

The final privacy screenshots show the Dashboard's Authentication information
and Financial and payment information definitions, with both categories unchecked.
The recorded selection is consistent with the reviewed disclosure for recognized
protected controls; heuristic detection remains a documented limitation rather
than an absolute guarantee. Do not claim that local processing means no user-data
processing. The policy and proposed answers agree on local
storage, deletion, user-initiated exports, heuristic safeguards and GitHub Pages
request metadata; no privacy text changes are required by this release.

## Public URL checks

Unauthenticated HTTPS requests in this preparation returned:

| Address | Result |
| --- | --- |
| https://gufvr.github.io/stepscript/privacy.html | HTTP 200; response text exactly matches `public/privacy.html` |
| https://github.com/gufvr/stepscript/issues | HTTP 200 |
| https://github.com/gufvr/stepscript | HTTP 200 |

These requests establish public availability, not publisher-domain verification
or a Chrome Web Store review result. The policy retains its canonical StepScript
address, effective date September 10, 2026, support link and Limited Use statement.

## Manual operation after owner confirmation

1. Sign in to the existing developer account at the
   [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   Verify the account is the intended one; do not change the existing other item.
2. Choose **Add new item**, select the audited `stepscript-extension.zip`, and
   upload it. The upload creates an editable item; it is not a review request.
3. Record the new item ID, dashboard URL, visible status and package version in
   this document. If the ZIP is rejected, record the exact error and stop.
4. Enter only the approved fields above. If a field has no matching approved
   answer, record its wording for review. Do not choose distribution, pricing,
   account or publisher settings as part of this release.
5. Upload the files in the asset table below, preserving the screenshot order.
   Saving approved listing/privacy/test-instruction fields is permitted after
   confirmation; it does not authorize review or publication.
6. Inspect the actual video field, required-field indicators and draft validation
   messages. Do not use **Submit for review** as a way to test required fields.
   Record video as optional, required, or unresolved with the exact UI evidence.
7. Save the approved draft fields. Reopen the listing to confirm persisted text,
   URLs, image order and package version, then record the save result and any
   remaining validation gaps. Stop with the item unpublished.

### Asset upload order

| Dashboard target | Existing file | Dimensions |
| --- | --- | --- |
| Store icon | `docs/chrome-web-store-assets/store-icon-128x128.png` | PNG 128x128 |
| Screenshot 1 | `docs/chrome-web-store-assets/01-recording.png` | PNG 1280x800 |
| Screenshot 2 | `docs/chrome-web-store-assets/02-steps-and-checks.png` | PNG 1280x800 |
| Screenshot 3 | `docs/chrome-web-store-assets/03-generated-code.png` | PNG 1280x800 |
| Small promotional image | `docs/chrome-web-store-assets/small-promo-440x280.png` | PNG 440x280 |
| Marquee promotional image | `docs/chrome-web-store-assets/marquee-promo-1400x560.png` | PNG 1400x560 |

Use the existing files without resizing or recapturing. Screenshots show the real
direct-extension interface in Portuguese; the tile is promotional illustration.
The visual review and provenance are in
[`chrome-web-store-assets/ASSET-HANDOFF.md`](chrome-web-store-assets/ASSET-HANDOFF.md).
Owner confirmation for the draft should also confirm use of this reviewed asset set.

## Verification and stopping point

- [x] Rebuilt ZIP passes build and package audit.
- [x] Version, 80-character summary, policy and icon match production sources.
- [x] Listing asset hashes, PNG dimensions and ZIP exclusion verified.
- [x] Public policy, homepage and support return HTTP 200.
- [x] Published policy text matches the local source.
- [x] Exact canonical copy sources and field values prepared.
- [x] Explicit owner confirmation received at the external-action gate.
- [x] Draft ID and status recorded from the actual item.
- [x] Status page confirms the draft is not published.
- [x] Approved listing, privacy fields, test instructions and assets saved/reopened by the owner.
- [x] Actual video observation recorded: the field is optional.
- [x] Final screenshots reviewed; documented privacy categories and required values confirmed through owner evidence.
- [x] Supplied screenshots retain Draft status; no review request or publication action performed by the agent.

If video is required, leave the draft unpublished and plan a video-only release.
If required fields are unresolved, retain the draft and record the gaps. Deleting
the draft, submitting it for review and publishing it each require separate
authorization. This checklist is not a declaration that the project is version 1.0
or Google approval; see the completed Store 1E.2 evidence follow-up below.

## Store 1E.2 final validation — September 16, 2026

### Local execution evidence

Validated against local HEAD `51f8a74`, with the existing handoff edits preserved.
No Dashboard session was accessed: the external evidence is limited to the
owner's screenshots and statements in this conversation. No production source,
asset, manifest, dependency, version or policy was changed.

| Check / command | Observed result |
| --- | --- |
| `npm test -- --maxWorkers=2` | PASS: 60 files, 468 tests; integration scenarios included; 91.59 seconds |
| `npm run lint` | PASS: exit code 0 |
| `npm run package:extension` | PASS: TypeScript, both Vite builds, classic-recorder verifier and ZIP validator; includes `npm run build` |
| ZIP structural/content audit | PASS: 20 entries, root manifest, no `dist` wrapper, essential files and local references valid; version 0.5.0, minimum Chrome 116, exact 80-character summary |
| Source/package identity | PASS: manifest, policy HTML/CSS and icon match source bytes; all 20 entry hashes match the pre-validation archive |
| Listing asset audit | PASS: six existing PNGs match capture hashes and dimensions; 8-bit RGB / 24-bit color without alpha; none included in ZIP |
| `npm run test:extension` | PASS: 1 real-extension Chromium scenario, 5.2 seconds; capture, local storage, full navigation, recorder resumption, URL assertion and stop |
| `npm run test:exported` | PASS: 7 Playwright tests in Chromium and 7 Cypress specs in headless Electron 138; no failures, skipped or pending tests |
| Export preparation | PASS: 4 shared flows / 20 supported steps plus 3 exclusive assertion flows / 3 steps for each framework; generation rejects TODO and unsupported steps |
| Focused branding/package/privacy tests | PASS: 3 files, 13 tests; explicit legacy-line allowlist checked |
| `npm run prepare:privacy-site` | PASS: minimal 5-file local artifact; no workflow or publication action |
| Active-branding/URL audit | PASS: packaged text contains no former brand; configuration, policy and listing use current StepScript URLs; local policy path remains `/privacy.html`; origin points to the current repository |
| Public policy | PASS: unauthenticated HTTPS HTTP 200; response text exactly equals `public/privacy.html`; current canonical, title, effective date, support and Limited Use content preserved |
| Public CSS, icon, support and homepage | PASS: each returns HTTP 200 over HTTPS without credentials |
| Workflow scope | PASS: publication remains exclusively `workflow_dispatch`; no workflow run initiated |
| `git diff --check` | PASS after the handoff update; only the handoff is modified in the tracked worktree |

Browser validation used the already installed Chromium at the ignored
`test-results/store-assets/browsers` location via `PLAYWRIGHT_BROWSERS_PATH`.
The first sandboxed E2E/export runs stopped producing output without terminating
and were interrupted; they are not counted as passing runs. Repeating the
unchanged commands with approved execution outside the sandbox completed with
exit code 0. No runner or product fix was introduced. Browser/export/privacy
artifacts remain in ignored `test-results` directories; the rebuilt ZIP remains
the existing ignored distribution artifact.

### Dashboard evidence matrix

“Confirmed” means visible in supplied evidence, not independent authenticated
inspection. “Pending” is a missing proof, not a claim that a field is incorrect.
This matrix includes the final follow-up screenshots and the owner's explicit
confirmation that the saved sections were reopened. The latest available
Dashboard evidence still shows Draft status.

| Area | Owner evidence available | Decision / remaining gate |
| --- | --- | --- |
| Item identity | Package page shows StepScript and the recorded item ID | Confirmed |
| Package version/type/permissions | Package page shows 0.5.0, Extension and the five approved permissions | Confirmed; uploaded ZIP hash/content not independently available |
| Unpublished status | Package page says the item has not been published; Status page says “Este rascunho não foi publicado.” | Confirmed at capture time; no review/publication action performed in this release |
| Name and summary | Final listing screenshot shows StepScript and the exact approved English summary | Confirmed |
| Category | Final listing screenshot shows “Ferramentas para desenvolvedores” | Confirmed |
| Primary language | Final listing screenshot shows “inglês (Estados Unidos)” | Confirmed; Portuguese UI is disclosed in the description |
| Detailed description/content rating | Final screenshots show core features, local storage, heuristic protection, Portuguese UI, export limitations and adult-content toggle off | Confirmed through visible content and owner's save/reopen confirmation |
| Homepage/support/privacy URLs | Final screenshots show current StepScript homepage/support and the privacy field; end of privacy URL is visually clipped | Homepage/support observed; owner confirms saved/reopened values after exact-URL guidance; public policy verified locally |
| Single purpose/permission justifications | Final privacy screenshots show purpose and all five filled justifications | Confirmed; no separate host-justification field shown |
| Remote code | Final privacy screenshot selects “Não, não estou usando código remoto” | Confirmed |
| Data categories | Final screenshots select PII, Web history, User activity and Website content; other displayed categories unchecked | Confirmed selection; no separate Form data category displayed; sensitive-detection limitations remain documented |
| Data-use certifications | Final privacy screenshot shows all three declarations checked | Confirmed |
| Reviewer instructions/credentials | Original saved screenshot contained document commentary; owner confirms replacing it with the approved 440-character operational instructions and saving | Confirmed by owner report; credentials remain empty in supplied screenshot |
| Store icon | Final listing screenshot shows the icon without the earlier size error | Confirmed; source derivative passes local audit |
| Screenshots/promotional assets | Final listing screenshots show recording, management/checks and code previews in order, small tile and marquee | Confirmed display and owner save/reopen report; no upload error visible |
| Video | Final form shows an empty video field without required marker | Optional in supplied evidence; no visible video blocker |
| Distribution | Final screenshots select free, public, all regions and all unlisted regions | Confirmed configuration and owner save/reopen report |
| Validation messages | Final sections show no required-field/upload errors; owner supplied confirmation dialog and subsequent Pending review screenshot | Submission accepted into review; no error visible in supplied evidence |

### Readiness decision and handoff

**Local validation: PASS. Submission readiness: GO based on final owner evidence,
with subsequent authorization and submission completed in Store 1E.3.**
No local product defect was found by these checks. The owner supplied the missing
screenshots, corrected the reviewer instructions and confirmed saving/reopening
the sections. This decision does not constitute Chrome Web Store approval.
No commit, push, review request or publication was made by the agent.

## Store 1E.3 submission handoff

Prepared on September 16, 2026, 23:03 -03:00. This timestamp describes preparation,
not submission. The agent has no authenticated Dashboard session; the owner
performed the authorized external action and supplied the resulting UI evidence.

### Approved reviewer instructions (440 characters)

The actual Dashboard field limits instructions to 500 characters. The owner
confirmed replacing the previously saved document commentary with this text:

```text
No login required. UI is in Portuguese. Use fictional data.
1. Open an HTTPS page with form controls.
2. Open StepScript, click "Iniciar Gravação" and grant site access.
3. Click elements, fill a field and navigate with Tab.
4. Click "Parar Gravação" and review steps.
5. Generate Playwright or Cypress code; preview, copy or download it.
Protected values and unsupported actions become TODO comments. Tests do not run inside the extension.
```

### External action record

| Record | Current value |
| --- | --- |
| Item/version | StepScript / 0.5.0; use the existing draft, not Add new item |
| Submission authorization | Owner explicitly replied “Confirmo” before the external action |
| Latest visible status | Revisão pendente / Pending review |
| Confirmation dialog | Owner screenshot: Enviar “StepScript” para análise?; same product |
| Publication choice | “Publicar ‘StepScript’ automaticamente após a revisão” unchecked in the supplied dialog; deferred/manual publication selected |
| Submission date/time | Completed on September 16, 2026; Pending review evidence recorded at 23:06 -03:00; exact click time not supplied |
| Resulting review status | Owner screenshot explicitly shows “Status: Revisão pendente” for the same item ID |
| Validation/warning messages | Dialog states review may take several weeks and narrower permissions may reduce review time; no blocking error shown |
| Publication status | Pending review, with automatic publication disabled in the confirmation evidence; no approval or publication evidenced |
| Completion | COMPLETE: authorized owner submission evidenced; awaiting Google's review decision |

### Owner operation after explicit authorization

1. In the existing StepScript draft, click **Enviar para análise** to inspect the
   confirmation dialog. Verify the item and review any validation messages.
2. If offered, disable automatic publication after approval and choose deferred
   / manual publication. Inspect the actual label rather than assume its wording.
   If the option is absent or unclear, provide the dialog evidence before final
   submission so the owner can decide whether to accept automatic publication.
3. With explicit authorization for submission and the chosen publication setting,
   confirm the final send. If an error appears, record its exact text; do not
   change fields or resubmit speculatively.
4. Provide the resulting **Status** screen and confirmation of the publication
   choice. Record actual submission time, review status and warnings above.
   A successful send should show a review-related status; it is not approval.
5. Stop after submission. For deferred publication, a separate owner decision
   will authorize publishing following approval. The official guide allows up to
   30 days after approval to publish a staged item; use the Dashboard's actual
   expiry date when available. After expiry it returns to Draft and requires
   another review submission.

The publication options and staged-item deadline follow the
[official publication guide](https://developer.chrome.com/docs/webstore/publish/)
reviewed during the Store 1E.3 plan. No approval date or review duration is
promised. The agent reviewed the owner-supplied confirmation screenshot; the
owner performed submission. No product change, commit, push or publication was
performed. The next handoff is the actual review outcome and, if approved, the
Dashboard's staged-publication status and expiry date.

## Official references

- [First upload and submission are separate actions](https://developer.chrome.com/docs/webstore/publish)
- [Listing fields and graphic assets](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Image dimensions and mandatory asset set](https://developer.chrome.com/docs/webstore/images)
- [Privacy practices fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Reviewer test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)

Preparation does not require any commit, push, dashboard submission or publication.
