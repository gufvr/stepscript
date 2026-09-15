# StepScript external cutover

This runbook covers the external rename from `gufvr/flowsnap` to
`gufvr/stepscript`. It does not change extension behavior, persisted data,
permissions, or the local project directory.

## Pre-cutover baseline

- Local branch: `master`
- Local remote: `https://github.com/gufvr/flowsnap.git`
- Public repository: `https://github.com/gufvr/flowsnap`
- Target repository: `https://github.com/gufvr/stepscript`
- Target privacy policy: `https://gufvr.github.io/stepscript/privacy.html`
- Target support URL: `https://github.com/gufvr/stepscript/issues`
- Packaged fallback: `/privacy.html`
- Privacy publishing workflow: manual `workflow_dispatch` only

Before the rename, the old repository is expected to respond successfully and
the target repository and target privacy policy may return `404`.

## Cutover verification record

Verified on September 14, 2026:

- [x] The repository was renamed to `gufvr/stepscript`.
- [x] The old repository URL returns `301` to the new repository URL.
- [x] The new repository and issue tracker return `200` without authentication.
- [x] The local `origin` uses `https://github.com/gufvr/stepscript.git` for fetch
  and push.
- [x] Reading `HEAD` from the new remote succeeds without pushing.
- [x] GitHub Pages uses GitHub Actions as its source with HTTPS enforced.
- [x] Manual workflow run 1 completed successfully for commit `c535605`:
  `https://github.com/gufvr/stepscript/actions/runs/34919948625`.
- [x] The target privacy policy, stylesheet, and icon return `200` without
  authentication, and HTTP redirects to HTTPS.
- [x] The published policy, stylesheet, and icon match their local sources by
  SHA-256.
- [x] The policy title, canonical URL, stylesheet, icon, and support link are
  present and correct.
- [x] The legacy privacy URL returns `404` and is not an active destination.
- [ ] Chrome Web Store URLs are ready for a later manual update and have not
  been submitted in this release.

## Manual cutover

1. Confirm that the working tree is clean and record `git remote -v`.
2. In GitHub, open the repository settings and rename `flowsnap` to
   `stepscript`.
3. Confirm that `https://github.com/gufvr/stepscript` and its issue tracker are
   available without authentication.
4. Update the local remote without pushing:

   ```bash
   git remote set-url origin https://github.com/gufvr/stepscript.git
   git remote -v
   git ls-remote origin HEAD
   ```

5. In the renamed repository, configure GitHub Pages to use GitHub Actions if
   it is not already configured.
6. Manually run the `Publish privacy policy` workflow and wait for a successful
   deployment.
7. Confirm that `https://gufvr.github.io/stepscript/privacy.html` is available
   over HTTPS without authentication.

## Acceptance checklist

- The target repository and issue tracker return a successful HTTPS response.
- The old repository URL redirects to the renamed repository.
- The target privacy page returns a successful HTTPS response.
- The policy canonical URL is the target privacy URL.
- The policy support link is the target issue tracker.
- The published policy matches `public/privacy.html`.
- The Side Panel public link opens the target privacy URL.
- The packaged `/privacy.html` fallback remains available.
- No active configuration or documentation destination uses the old privacy
  URL.
- No push, Chrome Web Store submission, or automatic Pages deployment occurred
  as part of the local cutover.

## Chrome Web Store follow-up

After every public check passes, update these fields manually in the Chrome Web
Store dashboard:

- Privacy policy URL: `https://gufvr.github.io/stepscript/privacy.html`
- Support URL: `https://github.com/gufvr/stepscript/issues`
- Website or repository URL, if present: `https://github.com/gufvr/stepscript`

Do not submit the listing until the public privacy URL is stable and accessible
without authentication.

## Rollback

If the repository rename fails, keep the existing remote and stop the cutover.

If the repository was renamed but local remote validation fails:

```bash
git remote set-url origin https://github.com/gufvr/flowsnap.git
git remote -v
```

If GitHub Pages deployment fails, do not update or submit the Chrome Web Store
listing. Keep using the packaged `/privacy.html` fallback while the external
deployment is repaired. Renaming the repository back is the final rollback and
must be performed manually in GitHub repository settings.
