# StepScript Chrome Web Store listing

Prepared on September 16, 2026 for Release Store 1D.1. This is a reviewed content
draft for later dashboard entry. Package metadata and language alignment must be
resolved before upload.

## Copy-ready fields

| Field | Proposed value |
| --- | --- |
| Name | StepScript |
| Category | Developer Tools |
| Primary listing language | English (United States) |
| Privacy policy URL | https://gufvr.github.io/stepscript/privacy.html |
| Support URL | https://github.com/gufvr/stepscript/issues |
| Homepage URL | https://github.com/gufvr/stepscript |

Category and language are proposed dashboard selections. Confirm their exact
labels in the current dashboard. The homepage is the project's repository and
README, not a separate landing page or verified publisher domain.

### Summary

```text
Record browser flows and generate readable Playwright and Cypress tests locally.
```

Validated length: 80 characters, including spaces and punctuation. The official
summary limit is 132 characters and the field must use plain text
([listing guidance](https://developer.chrome.com/docs/webstore/best-listing)).
This draft summary is not yet the uploaded manifest description.

### Detailed description

Copy only the following block into the detailed description field:

```text
StepScript records browser interactions and turns the recorded flow into readable Playwright and Cypress test code. Use its Side Panel to record, review, organize, and export a flow for your own testing project.

Core features:
- Record clicks, supported form changes, selections, keyboard interactions, and navigation in the authorized tab and site.
- Review human-readable step descriptions and recommended selectors.
- Edit descriptions, reorder steps, delete individual steps, or clear the flow.
- Add manual checks for an exact URL, element visibility, or exact normalized visible text.
- Preview, copy, or download generated Playwright and Cypress test files.

Recordings are stored locally in your Chrome profile. StepScript has no account system, cloud backend, telemetry, analytics, or advertising service. It does not automatically upload your recordings or sync them to another device. Steps remain until you delete them, clear the flow, or uninstall the extension. Local recording data is not encrypted by StepScript.

Recognized sensitive form controls are classified before their values are read and are represented by protected markers. Detection is heuristic: ordinary form values, URLs, selectors, and visible page text may still contain personal or sensitive information. Use test data and review the flow before sharing an export. Opening the public privacy policy contacts GitHub Pages, which may process ordinary request metadata; recorded data is not attached to that request.

The current interface and recorded step descriptions are in Portuguese. Generated test commands use the APIs of the selected testing framework. Protected values and unsupported actions appear as TODO comments for you to complete. Review generated code in your own project before running it. StepScript generates test code; it does not run tests from the Side Panel.

No account or subscription is required to use StepScript. Website access is requested for the current site when you start recording. Review the privacy policy for the full data-processing details and limitations.
```

This description follows the requirement for accurate metadata and consistent
privacy disclosures. Avoid adding unverified guarantees, rankings, endorsements,
or repetitive keywords
([listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)).

## Content-rating guidance

Proposed setting: **Mature content: No**. StepScript is a developer testing tool
and includes no mature content in its bundled interface or proposed listing.
Review the final screenshots and listing materials against the dashboard's
content-rating guidance before choosing the setting. This is not an age rating
or a claim that arbitrary websites visited by users are suitable for children
([listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)).

## Reviewer instructions

The Test instructions tab is optional. These notes help reviewers exercise the
product; no credentials, paid account, or secret test values are needed
([test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)).

Copy-ready notes:

```text
No credentials, subscription, or external test runner are required to evaluate the extension. The current interface is in Portuguese. Use fictional test values only.

1. Open a public HTTP or HTTPS page with a form and visible controls. https://qapracticehub.com/#forms is an optional public example; if unavailable, another ordinary form page can be used. Browser-internal pages such as chrome:// are not recording targets.
2. Select the StepScript toolbar action to open its Side Panel.
3. Read the privacy notice and select "Iniciar Gravação" (Start Recording). Grant website access for that site's origin when prompted. Declining access should not start recording.
4. Click a field, enter a fictional value, and move focus using Tab. Leave the edited field to finish its consolidated fill step. Review the descriptions and selectors that appear in the Side Panel.
5. Add an exact current-URL check. Try the element visibility and exact-text selection modes on an ordinary visible text element. Escape cancels selection.
6. Select "Parar Gravação" (Stop Recording). Edit a description, move a step, and confirm an individual deletion. Canceling an edit or deletion should preserve the step.
7. Select "Gerar Playwright" or "Gerar Cypress" to inspect the generated preview. Exercise its copy and download actions. Protected values and unsupported actions are represented by TODO comments and require manual completion.
8. Reopen the Side Panel to verify the retained flow. Use "Limpar tudo" (Clear All) and confirm to delete the recorded steps.

Recordings are stored locally. The extension does not execute generated tests. Running downloaded files later requires a separate Playwright or Cypress project configured by the user.
```

The optional example website is not a StepScript service, dependency, or required
account. Recheck these instructions with the packaged extension before upload.

## Privacy-claim cross-check

The policy source is [public/privacy.html](../public/privacy.html). The proposed
dashboard answers are [chrome-web-store-privacy.md](chrome-web-store-privacy.md).
These documents remain the source of truth for privacy disclosures.

| Listing or reviewer claim | Policy sections | Privacy practices evidence |
| --- | --- | --- |
| User-initiated capture limited to authorized tab/site | 2, 3, 8 | Single purpose; activeTab, scripting and optional host permissions |
| URLs, selectors, form values, interactions and manual checks may be processed | 2, 3 | Data disclosure; sidePanel and webNavigation justifications |
| Local profile storage, no sync/upload, retention and user deletion | 4, 10 | storage justification; Data usage certifications |
| No account/backend, telemetry, analytics or advertising | 1, 7 | Local processing and Data usage certifications; policy supplies account/backend details |
| Sensitive controls classified before value reading; protection is heuristic | 5 | Data disclosure safeguards and limitations |
| Ordinary values, URLs, selectors and text may contain sensitive information | 5 | Data disclosure categories and conservative review guidance |
| Local data has no application-level encryption | 4, 9 | Local storage context; policy supplies encryption limitation |
| Copy/download are user initiated; later execution belongs to the user's runner | 6 | Data usage certifications; policy supplies external execution distinction |
| Opening hosted policy may expose request metadata to GitHub, without recordings | 7 | Privacy policy URL hosting disclosure |

No claim promises universal secret detection, universal selector reliability,
encrypted storage, remote execution, or automatic anonymization. Framework
coverage and TODO behavior are product limitations, not privacy guarantees.
Complete the Privacy practices tab using its separate document and current field
definitions; the listing text is not a substitute for those answers.

## Manifest-description language gate

The current manifest description is Portuguese:

```text
Grave fluxos no navegador e transforme-os em testes automatizados.
```

The English summary above is a proposed replacement. Resolve this mismatch in a
separate authorized release before the planned English package is uploaded: align
the manifest description to the approved English summary, or implement intentional
localization. The dashboard cannot directly repair uploaded manifest metadata
([package preparation](https://developer.chrome.com/docs/webstore/prepare)).

English listing copy does not mean the current Portuguese interface has English
support. Keep that limitation visible unless a later product release translates
the interface. Listing localization and interface localization are separate work.
This editorial upload gate does not assert that bilingual metadata is prohibited.

## Asset handoff for a later release

- [ ] Review the existing 128x128 PNG extension icon, including its clarity on
  light and dark backgrounds.
- [ ] Prepare one to five screenshots of the actual current extension at
  1280x800 (preferred) or 640x400, with square corners and no padding.
- [ ] Prepare a 440x280 small promotional image.
- [ ] Consider an optional 1400x560 marquee image and optional demonstration video.
- [ ] Show recording, editable steps/assertions, and generated code using
  fictional data. Preserve the actual Portuguese interface in screenshots.
- [ ] Inspect the current dashboard's required fields before submission.

The dedicated [image requirements](https://developer.chrome.com/docs/webstore/images)
identify the icon, small promotional image, and screenshot as mandatory. The
general listing page uses broader wording about promotional media; confirm the
dashboard indicators before upload rather than treating video as mandatory solely
from that wording. No assets are produced by this content release.

## Review record

- Summary counted at 80 characters and checked against the 132-character limit.
- Privacy claims cross-checked against both local privacy sources above.
- Product name and proposed URLs align with the StepScript configuration.
- Category, language and content rating remain proposed dashboard values.
- Manifest language alignment, visual assets and final packaged reviewer walk-through
  remain later release gates.
- Official sources linked throughout were checked on September 16, 2026.
