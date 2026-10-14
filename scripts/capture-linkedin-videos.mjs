import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'docs', 'linkedin-assets');
const work = resolve(root, 'test-results', 'linkedin-video-capture');
const port = 4177;
const origin = `http://127.0.0.1:${port}`;
const recordingWarmup = '<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:#11162c;color:#f8f7ff;font:700 30px system-ui;display:grid;place-items:center}main{display:flex;align-items:center;gap:14px}i{display:block;width:28px;height:28px;border:6px solid #8b50ff;border-radius:50%;box-sizing:border-box}</style><main><i></i>StepScript</main>';

const code = {
  Playwright: `import { test, expect } from "@playwright/test";\n\ntest("login and dashboard", async ({ page }) => {\n  await page.goto("https://app.example.com/login");\n  await page.getByLabel("E-mail").fill("qa.demo@example.com");\n  await page.getByLabel("Senha").fill(process.env.QA_PASSWORD!);\n  await page.getByTestId("login-submit").click();\n  await expect(page).toHaveURL("https://app.example.com/dashboard");\n});`,
  Cypress: `describe("login and dashboard", () => {\n  it("accesses the dashboard", () => {\n    cy.visit("https://app.example.com/login");\n    cy.get('[data-testid="login-email"]').type("qa.demo@example.com");\n    cy.get('[data-testid="login-password"]')\n      .type(Cypress.env("QA_PASSWORD"), { log: false });\n    cy.get('[data-testid="login-submit"]').click();\n    cy.url().should("eq", "https://app.example.com/dashboard");\n  });\n});`,
};
const sourceHtml = await readFile(resolve(output, 'source', 'video.html'), 'utf8');
const routes = new Map([
  ['/icon.png', [resolve(root, 'public', 'icons', 'icon-128.png'), 'image/png']],
  ['/font.woff2', [resolve(root, 'node_modules', '@fontsource', 'poppins', 'files', 'poppins-latin-400-normal.woff2'), 'font/woff2']],
]);

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, origin);
  if (requestUrl.pathname === '/video.html') {
    const framework = requestUrl.searchParams.get('framework');
    if (!code[framework]) { response.writeHead(400).end('Unknown framework'); return; }
    const body = sourceHtml.replace('__VIDEO_DATA__', JSON.stringify({ framework, code: code[framework] }));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(body);
    return;
  }
  const route = routes.get(requestUrl.pathname);
  const videoFramework = /^\/(playwright|cypress)\.webm$/i.exec(requestUrl.pathname)?.[1];
  if (videoFramework) {
    try {
      response.writeHead(200, { 'Content-Type': 'video/webm', 'Cache-Control': 'no-store' });
      response.end(await readFile(resolve(output, `stepscript-${videoFramework.toLowerCase()}-demo.webm`)));
    } catch { response.writeHead(404).end(); }
    return;
  }
  if (!route) { response.writeHead(404).end(); return; }
  try {
    response.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store' });
    response.end(await readFile(route[0]));
  } catch { response.writeHead(500).end(); }
});

await mkdir(output, { recursive: true });
await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });
await new Promise((accept, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', accept);
});

try {
  for (const framework of Object.keys(code)) {
    const context = await chromium.launchPersistentContext(resolve(work, framework.toLowerCase()), {
      channel: 'chromium',
      headless: true,
      viewport: { width: 1080, height: 1350 },
      recordVideo: { dir: resolve(work, 'videos'), size: { width: 1080, height: 1350 } },
    });
    const page = await context.newPage();
    const video = page.video();
    await page.setContent(recordingWarmup, { waitUntil: 'domcontentloaded' });
    await page.goto(`${origin}/video.html?framework=${framework}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(20_300);
    await context.close();
    await copyFile(await video.path(), resolve(output, `stepscript-${framework.toLowerCase()}-demo.webm`));
  }

  const probe = await chromium.launch({ channel: 'chromium', headless: true });
  try {
    for (const framework of Object.keys(code)) {
      const page = await probe.newPage({ viewport: { width: 1080, height: 1350 } });
      const metadata = await page.evaluate(async ({ src }) => new Promise((accept, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => accept({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
        video.onerror = () => reject(new Error('Video metadata could not be loaded'));
        video.src = src;
      }), { src: `${origin}/${framework.toLowerCase()}.webm` });
      assert.equal(metadata.width, 1080);
      assert.equal(metadata.height, 1350);
      assert.ok(metadata.duration >= 20 && metadata.duration <= 25, `${framework} duration: ${metadata.duration}`);
      await page.setContent(`<video muted autoplay src="${origin}/${framework.toLowerCase()}.webm" style="width:1080px;height:1350px"></video>`);
      await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
      await page.evaluate(() => new Promise((accept) => {
        const video = document.querySelector('video');
        video.currentTime = 0.1;
        video.addEventListener('seeked', accept, { once: true });
      }));
      await page.screenshot({ path: resolve(work, `${framework.toLowerCase()}-first-frame.png`) });
      await page.goto(`${origin}/video.html?framework=${framework}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2_000);
      await page.screenshot({ path: resolve(work, `${framework.toLowerCase()}-recording-preview.png`) });
      await page.waitForTimeout(13_000);
      await page.screenshot({ path: resolve(work, `${framework.toLowerCase()}-preview.png`) });
      console.log(`${framework}: ${metadata.width}x${metadata.height}, ${metadata.duration.toFixed(1)} seconds.`);
    }
  } finally {
    await probe.close();
  }
  console.log(`Created LinkedIn-ready WebM demos in ${output}.`);
} finally {
  await new Promise((accept) => server.close(accept));
}
