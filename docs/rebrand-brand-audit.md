# StepScript brand audit

Audit date: September 16, 2026.

## Verified local evidence

- The extension manifest, HTML title, Side Panel, generated tests, selector
  copy header, downloads, NPM package, README, and distribution package use
  StepScript.
- No tracked filename contains the previous product name.
- The README logo is `assets/stepscript-logo.png`. The rename preserves the
  original image bytes; the artwork contains no product-name text.
- Privacy configuration uses
  `https://gufvr.github.io/stepscript/privacy.html`; support uses
  `https://github.com/gufvr/stepscript/issues`.
- The local fallback remains `/privacy.html`.
- Persisted keys and schemas are unchanged. Existing recordings require no
  migration.

## Explicit legacy exceptions

`scripts/branding-legacy-allowlist.json` inventories ten exact lines with their
reasons. Exceptions are scoped to a file and a complete trimmed line, with one
occurrence permitted. New occurrences and stale exceptions fail the static
branding test. The inventory itself is exempt from content scanning because it
contains the literals being checked.

| File | Allowed purpose | Occurrences |
| --- | --- | --- |
| `docs/rebrand-external-cutover.md` | Historical baseline, rename procedure, and rollback | 5 |
| `scripts/prepare-privacy-site.mjs` | Rejection guards for the previous policy URL and name | 3 |
| `scripts/prepare-privacy-site.test.mjs` | Negative regression inputs | 2 |

These exceptions are not active product destinations or user-facing branding.
The local checkout directory is intentionally unchanged and is outside the
published package. Historical Git commits are also outside this audit's source
scan.

The static test scans Git-tracked and non-ignored new text files and filenames.
Binary artwork requires visual inspection; ignored build outputs are verified
by the build and package checks rather than the source scan.

## External evidence and limits

The cutover runbook records the repository rename, public issue tracker,
successful manual Pages deployment, HTTPS availability, and identical published
policy, CSS, and icon hashes verified on September 14, 2026. Those checks are
historical evidence, not a fresh network availability check for this release.

Repository name and remote use StepScript. The repository description previously
verified during cutover is generic and does not contain the previous product
name. Social preview artwork and unpublished Chrome Web Store dashboard fields
have not been inspected and must be checked during listing preparation.

## Required before listing submission

1. Prepare the listing name, summary, detailed description, category, primary
   language, support and privacy URLs, and reviewer instructions.
2. Capture current screenshots with StepScript branding and non-sensitive
   fixture data; prepare the required listing images using the current Web Store
   specifications.
3. Apply and review the proposed Privacy practices responses against the
   extension's actual behavior.
4. Check every listing field and uploaded image for obsolete names and URLs.
5. Recheck public privacy and support availability before submission.

There are no remaining active legacy brand references requiring changes in
production source. Listing material creation is a separate release.

## Recommended follow-up

- Use English as the primary listing language, with Portuguese localization
  considered separately.
- Review repository social preview artwork for consistency with the listing.
- Keep the current icon unless a separate artwork review identifies a quality
  issue; do not change artwork merely because its filename changed.
- Rename the local checkout directory only in a separate optional maintenance
  step.

## Verification

Run the focused branding, privacy, and package tests, followed by lint, build,
distribution packaging, and `git diff --check`. The public policy and listing
assets are not deployed by these checks.
