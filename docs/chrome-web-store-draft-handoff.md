# StepScript unpublished draft — Store 1E.1

## Current state and approval

Local preparation is complete. The external action is **awaiting explicit owner
confirmation** as required by this release. No StepScript item has been created,
no ZIP or listing asset has been uploaded, and no review has been requested.
Creation, uploads and saving the approved fields are performed manually by the
owner in the existing developer account; no credentials are shared with the agent.

| External record | Value |
| --- | --- |
| Owner confirmation | Pending |
| Draft item ID | Not created |
| Draft dashboard URL | Not available |
| Dashboard status | Not observed |
| Observed required fields | Pending first upload |
| Video requirement | Pending inspection of the actual draft form |
| Listing save result | Not performed |
| Submit for review | Not authorized; not performed |
| Publication | Not authorized; not performed |

Do not mark any pending observation as verified until the owner reports its
actual result. Record the item ID and dashboard URL here after creation; do not
record cookies, credentials, access tokens or private account settings.

## Audited upload package

Prepared on September 16, 2026 (local date). `npm run package:extension` completed
successfully, rebuilding and auditing the production archive.

| Check | Verified result |
| --- | --- |
| Upload file | `stepscript-extension.zip` at the project root |
| ZIP size | 181893 bytes |
| ZIP SHA-256 | `dcf4fe7b80d2677efe88e5ec26b1293f4e6e22d36521a2f38ec19c1b50afa701` |
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
| Test instructions | Copy only the **Copy-ready notes** `text` block under Reviewer instructions in `chrome-web-store-listing.md` |
| Test credentials | None required; leave credential fields empty |
| Video / YouTube URL | Leave empty while inspecting whether it is required; no approved video exists |
| Marquee / optional promotional video | Leave empty; outside this release |
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

The dashboard's current Authentication information and Financial and payment
information definitions still require owner inspection, as already noted in the
approved privacy document. Record any mismatch or ambiguity instead of guessing
an answer. Do not claim absolute sensitive-data detection or that local processing
means no user-data processing. The policy and proposed answers agree on local
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
- [ ] Explicit owner confirmation received at the external-action gate.
- [ ] Draft ID, dashboard URL and status recorded from the actual item.
- [ ] Approved listing, privacy fields, test instructions and assets saved/reopened.
- [ ] Actual required fields and video observation recorded.
- [ ] Any ambiguous privacy fields or missing mandatory values resolved separately.
- [ ] Confirm no review request or publication action occurred.

If video is required, leave the draft unpublished and plan a video-only release.
If required fields are unresolved, retain the draft and record the gaps. Deleting
the draft, submitting it for review and publishing it each require separate
authorization. This checklist is not a declaration that the project is version 1.0
or submission-ready; final release validation is a later step.

## Official references

- [First upload and submission are separate actions](https://developer.chrome.com/docs/webstore/publish)
- [Listing fields and graphic assets](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Image dimensions and mandatory asset set](https://developer.chrome.com/docs/webstore/images)
- [Privacy practices fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Reviewer test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)

Preparation does not require any commit, push, dashboard submission or publication.
