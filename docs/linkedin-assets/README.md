# StepScript LinkedIn demo videos

These two vertical, silent WebM videos are ready for a LinkedIn post:

| File | Content | Format |
| --- | --- | --- |
| `stepscript-playwright-demo.webm` | Login recording with Side Panel, recorded steps and Playwright code example | 1080x1350, about 20 seconds |
| `stepscript-cypress-demo.webm` | Login recording with Side Panel, recorded steps and Cypress code example | 1080x1350, about 20 seconds |

The visual sequence is deterministic: a fictional login page is shown beside a
StepScript Side Panel while a simulated pointer records four steps. It then
fades into the review and framework-specific test code. The login uses only
fictional data. Its protected password is represented by an environment variable
in the code examples; no account, credential or live-site content is used. WebM
is supported by LinkedIn on desktop, iOS and Android according to its [media type
support page](https://www.linkedin.com/help/linkedin/answer/a564109).

`source/video.html` is the editable motion-design source. It uses the existing
StepScript icon and does not modify the extension package. The capture script
records the local page in Chromium and confirms each resulting video's 1080x1350
dimensions and roughly 20-second duration.

To regenerate after changing the visual source or examples:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'test-results/store-assets/browsers'
node scripts/capture-linkedin-videos.mjs
```

The script writes temporary browser data and review frames under ignored
`test-results/linkedin-video-capture`.
