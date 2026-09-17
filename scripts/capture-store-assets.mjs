import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { readZipEntries, validateExtensionPackageEntries } from './verify-extension-package.mjs';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'docs/chrome-web-store-assets');
const work = resolve(root, 'test-results/store-assets', `capture-${Date.now()}`);
const extension = resolve(work, 'unpacked');
const origin = 'http://127.0.0.1:4176';
const fixtureUrl = `${origin}/fixture.html`;
const routes = new Map([
  ['/fixture.html', ['docs/chrome-web-store-assets/source/fixture.html', 'text/html; charset=utf-8']],
  ['/promo.html', ['docs/chrome-web-store-assets/source/promo.html', 'text/html; charset=utf-8']],
  ['/icon.png', ['public/icons/icon-128.png', 'image/png']],
  ['/font.woff2', ['node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2', 'font/woff2']],
]);

// Only the isolated E2E copy grants the local fixture origin in advance.
await mkdir(work, { recursive: true });
await cp(resolve(root, 'dist'), extension, { recursive: true });
const manifestPath = resolve(extension, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.host_permissions = ['http://127.0.0.1/*'];
delete manifest.optional_host_permissions;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const server = createServer(async (request, response) => {
  const route = routes.get(new URL(request.url, origin).pathname);
  if (!route) { response.writeHead(404).end(); return; }
  try {
    response.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store' });
    response.end(await readFile(resolve(root, route[0])));
  } catch { response.writeHead(500).end(); }
});
await new Promise((accept, reject) => {
  server.once('error', reject);
  server.listen(4176, '127.0.0.1', accept);
});

let context;
try {
  context = await chromium.launchPersistentContext(resolve(work, 'profile'), {
    channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).hostname;
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  await worker.evaluate(async (url) => {
    const target = (await chrome.tabs.query({})).find((tab) => tab.url === url);
    if (!target?.id || !target.windowId) throw new Error('Fixture tab missing');
    await chrome.storage.session.set({ activeTabContext: { tabId: target.id, windowId: target.windowId, url } });
  }, fixtureUrl);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/index.html`);
  await panel.getByRole('button', { name: 'Iniciar Gravação' }).click();
  await expect(panel.getByText('Status: Gravando')).toBeVisible();
  await page.getByTestId('demo-name').click();
  await page.getByTestId('demo-name').fill('Alex Demo');
  await page.getByTestId('demo-save').click();
  await expect(panel.getByText('3 passos capturados')).toBeVisible();
  await panel.evaluate(() => document.fonts.ready);
  await panel.getByLabel('Lista de passos gravados').evaluate((list) => {
    list.scrollTop = 180;
  });
  await panel.screenshot({ path: resolve(output, '01-recording.png') });

  await panel.getByRole('button', { name: 'Verificar elemento visível' }).click();
  await page.getByTestId('demo-result').click();
  await expect(panel.getByText('4 passos capturados')).toBeVisible();
  await panel.getByRole('button', { name: 'Verificar texto do elemento' }).click();
  await page.getByTestId('demo-result').click();
  await expect(panel.getByText('5 passos capturados')).toBeVisible();
  await panel.getByRole('button', { name: 'Mover passo 2 para cima' }).click();
  await panel.getByRole('button', { name: 'Editar descrição do passo 1', exact: true }).click();
  await panel.getByRole('textbox', { name: 'Descrição do passo 1', exact: true }).fill('Preencheu o nome com dados fictícios');
  await panel.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(panel.getByText('Preencheu o nome com dados fictícios')).toBeVisible();
  await panel.evaluate(() => {
    const top = document.getElementById('recorded-steps-title').getBoundingClientRect().top + scrollY;
    scrollTo(0, Math.max(0, top - 24));
  });
  await panel.getByLabel('Lista de passos gravados').evaluate((list) => {
    list.scrollTop = list.scrollHeight;
  });
  await panel.evaluate(() => document.activeElement?.blur());
  await panel.screenshot({ path: resolve(output, '02-steps-and-checks.png') });
  await panel.getByRole('button', { name: 'Parar Gravação' }).click();

  for (const framework of ['Cypress', 'Playwright']) {
    await panel.getByRole('button', { name: `Gerar ${framework}` }).click();
    await expect(panel.getByText(`Código ${framework}`, { exact: true })).toBeVisible();
    const preview = panel.getByLabel(`Prévia do código ${framework}`);
    const code = await preview.innerText();
    assert.ok(code.includes('Alex Demo') && code.includes('StepScript'));
    assert.ok(!/TODO\s+StepScript/.test(code));
    const downloadPromise = panel.waitForEvent('download');
    await panel.getByRole('button', { name: 'Baixar arquivo' }).click();
    const download = await downloadPromise;
    const downloadedPath = await download.path();
    assert.equal(await readFile(downloadedPath, 'utf8'), code);
    if (framework === 'Cypress') await panel.getByRole('button', { name: 'Fechar', exact: true }).click();
  }
  await panel.evaluate(() => {
    const title = document.getElementById('playwright-code-title');
    scrollTo(0, Math.max(0, title.getBoundingClientRect().top + scrollY - 230));
    document.activeElement?.blur();
  });
  await panel.screenshot({ path: resolve(output, '03-generated-code.png') });

  const tile = await context.newPage();
  await tile.setViewportSize({ width: 440, height: 280 });
  await tile.goto(`${origin}/promo.html`);
  await tile.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  await tile.screenshot({ path: resolve(output, 'small-promo-440x280.png') });
  for (const [name, width, height] of [
    ['01-recording.png', 1280, 800], ['02-steps-and-checks.png', 1280, 800],
    ['03-generated-code.png', 1280, 800], ['small-promo-440x280.png', 440, 280],
  ]) {
    const png = await readFile(resolve(output, name));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
  const entries = readZipEntries(await readFile(resolve(root, 'stepscript-extension.zip')));
  validateExtensionPackageEntries(entries);
  assert.deepEqual(JSON.parse(entries.get('manifest.json').toString('utf8')),
    JSON.parse(await readFile(resolve(root, 'public/manifest.json'), 'utf8')));
  // Byte-level checks also catch unexpected renamed copies in distribution.
  const { readdir } = await import('node:fs/promises');
  const distFiles = await readdir(resolve(root, 'dist'), { recursive: true });
  for (const name of ['01-recording.png', '02-steps-and-checks.png', '03-generated-code.png', 'small-promo-440x280.png']) {
    const bytes = await readFile(resolve(output, name));
    for (const [entryName, content] of entries) {
      assert.ok(!content.equals(bytes), `Listing asset included in ZIP: ${entryName}`);
    }
    for (const file of distFiles) {
      if (!file.endsWith('.png')) continue;
      assert.ok(!(await readFile(resolve(root, 'dist', file))).equals(bytes), `Listing asset included in dist: ${file}`);
    }
  }
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const evidence = {
    capturedAt: new Date().toISOString(), browser: context.browser().version(),
    extensionVersion: manifest.version, fixtureUrl,
    surface: 'Unmodified extension index.html rendered directly, not the native docked browser panel',
    viewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
    isolatedPermission: 'Only copied E2E manifest grants http://127.0.0.1/*; production manifest unchanged',
    fictionalFormValue: 'Alex Demo',
    sourceManifestSha256: hash(await readFile(resolve(root, 'public/manifest.json'))),
    iconSha256: hash(await readFile(resolve(root, 'public/icons/icon-128.png'))),
    zipSha256: hash(await readFile(resolve(root, 'stepscript-extension.zip'))),
    checks: { pngDimensions: true, downloadsMatchPreviews: ['Playwright', 'Cypress'], listingPngsAbsentFromDistribution: true },
    assets: {},
  };
  for (const name of ['01-recording.png', '02-steps-and-checks.png', '03-generated-code.png', 'small-promo-440x280.png']) {
    evidence.assets[name] = hash(await readFile(resolve(output, name)));
  }
  await writeFile(resolve(output, 'capture-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log('Captured 3 real extension screenshots and promotional tile; PNG dimensions, generated downloads and distribution exclusion verified.');
} finally {
  await context?.close();
  await new Promise((accept) => server.close(accept));
}
