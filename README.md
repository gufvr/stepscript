<p align="center">
  <img src="assets/stepscript-logo.png" width="150" alt="StepScript logo">
</p>

<h1 align="center">StepScript</h1>

StepScript is a Chrome extension that records browser flows and turns them into readable Playwright and Cypress tests.

## Core features

- Records clicks, form changes, selections, keyboard interactions, and navigation.
- Captures reliable selectors and editable human-readable descriptions.
- Adds URL, element visibility, and exact text assertions.
- Protects recognized sensitive values and stores recordings locally.
- Supports previewing, copying, organizing, and downloading generated tests.

## Requirements

- Node.js 24 or later
- npm 11 or later
- Google Chrome with Manifest V3 extension support

## Development

```bash
npm install
npx playwright install chromium
npm run dev
npm run lint
npm test
npm run test:integration
npm run test:exported
npm run test:extension
npm run build
```

## Load the unpacked extension

1. Run `npm run build`.
2. Open `chrome://extensions`, enable **Developer mode**, and select **Load unpacked**.
3. Choose the `dist` directory. Rebuild and reload the extension after changes.

## Build the distribution package

```bash
npm run package:extension
```

The command creates `stepscript-extension.zip` in the project root. ZIP archives are ignored by Git.
