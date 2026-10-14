import { expect, test } from './fixtures';
import { readFile } from 'node:fs/promises';

test('records login steps with a protected password and scans visible errors', async ({ context, page, serviceWorker, extensionId }) => {
  const url = 'http://127.0.0.1:4175/automation-login.html';
  await page.goto(url);
  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  await page.bringToFront();
  await serviceWorker.evaluate(async (targetUrl) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab.id || tab.windowId === undefined) throw new Error('Fixture tab missing');
    await chrome.storage.local.set({ recordedSteps: [], recordingState: { isRecording: false } });
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url: targetUrl } });
  }, url);

  await sidePanel.getByRole('button', { name: 'Executar automação de passos' }).click();
  await expect(sidePanel.getByText(/Detectado:/)).toBeVisible();
  await sidePanel.getByRole('textbox', { name: 'Usuário de teste' }).fill('qa@example.test');
  await sidePanel.getByLabel('Senha de teste').fill('fake-password');
  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await expect(page.getByTestId('login-email')).toHaveValue('qa@example.test');
  await expect(page.getByTestId('login-password')).toHaveValue('fake-password');
  await expect(page.getByRole('alert')).toHaveText('Dados de teste recebidos');
  await expect(sidePanel.getByRole('status').filter({ hasText: 'Ação “Entrar” acionada uma vez' })).toBeVisible();
  for (const framework of ['Playwright', 'Cypress']) {
    const downloadPromise = sidePanel.waitForEvent('download');
    await sidePanel.getByRole('button', { name: `Exportar ${framework}` }).click();
    const download = await downloadPromise;
    const code = await readFile((await download.path())!, 'utf8');
    expect(code).toContain('TEST_USERNAME');
    expect(code).toContain('TEST_PASSWORD');
    expect(code).not.toContain('fake-password');
    expect(code).not.toContain('qa@example.test');
  }
  await sidePanel.getByRole('combobox', { name: 'Tipo de automação' }).selectOption('visible-errors');
  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await expect(sidePanel.getByRole('status').filter({ hasText: 'Erro visível: Dados de teste recebidos' })).toBeVisible();
  const stored = await serviceWorker.evaluate(() => chrome.storage.local.get('recordedSteps'));
  expect(stored.recordedSteps.map((step: { type: string }) => step.type)).toEqual(['field-fill', 'field-fill', 'click']);
  expect(stored.recordedSteps[0].value).toEqual({ kind: 'plain', value: 'qa@example.test' });
  expect(stored.recordedSteps[1].value).toEqual({ kind: 'protected', reason: 'password' });
  expect(JSON.stringify(stored)).not.toContain('fake-password');
});

test('uses the hash-targeted OTP section without asking for a password', async ({ context, page, serviceWorker, extensionId }) => {
  const url = 'http://127.0.0.1:4175/automation-otp.html#otp-login';
  await page.goto(url);
  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  await page.bringToFront();
  await serviceWorker.evaluate(async (targetUrl) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab.id || tab.windowId === undefined) throw new Error('Fixture tab missing');
    await chrome.storage.local.set({ recordedSteps: [], recordingState: { isRecording: false } });
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url: targetUrl } });
  }, url);
  await sidePanel.getByRole('button', { name: 'Executar automação de passos' }).click();
  await expect(sidePanel.getByText(/Detectado:.*OTP Login/)).toBeVisible();
  await expect(sidePanel.getByLabel('Senha de teste')).toHaveCount(0);
  await sidePanel.getByRole('textbox', { name: 'Usuário de teste' }).fill('tester');
  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await expect(page.getByRole('status')).toHaveText('OTP solicitado para tester');
  await expect(sidePanel.getByRole('status').filter({ hasText: 'Fetch OTP' })).toBeVisible();
  const downloadPromise = sidePanel.waitForEvent('download');
  await sidePanel.getByRole('button', { name: 'Exportar Playwright' }).click();
  const download = await downloadPromise;
  const code = await readFile((await download.path())!, 'utf8');
  expect(code).toContain('TEST_USERNAME');
  expect(code).not.toContain('TEST_PASSWORD');
  const stored = await serviceWorker.evaluate(() => chrome.storage.local.get('recordedSteps'));
  expect(stored.recordedSteps.map((step: { type: string }) => step.type)).toEqual(['field-fill', 'click']);
  expect(stored.recordedSteps[0].value).toEqual({ kind: 'plain', value: 'tester' });
});

test('keeps an export available when a login redirects the page', async ({ context, page, serviceWorker, extensionId }) => {
  const url = 'http://127.0.0.1:4175/automation-login.html';
  await page.goto(url);
  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  await page.bringToFront();
  await serviceWorker.evaluate(async (targetUrl) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab.id || tab.windowId === undefined) throw new Error('Fixture tab missing');
    await chrome.storage.local.set({ recordedSteps: [], recordingState: { isRecording: false } });
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url: targetUrl } });
  }, url);
  await sidePanel.getByRole('button', { name: 'Executar automação de passos' }).click();
  await expect(sidePanel.getByText(/Detectado:/)).toBeVisible();
  await sidePanel.getByRole('textbox', { name: 'Usuário de teste' }).fill('redirect@example.test');
  await sidePanel.getByLabel('Senha de teste').fill('fake-password');
  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4175/next.html');
  await expect(sidePanel.getByRole('button', { name: 'Exportar Playwright' })).toBeVisible();
});

test('reviews a phone target and completes a second password-only login step', async ({ context, page, serviceWorker, extensionId }) => {
  const url = 'http://127.0.0.1:4175/automation-adaptive.html';
  await page.goto(url);
  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  await page.bringToFront();
  await serviceWorker.evaluate(async (targetUrl) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab.id || tab.windowId === undefined) throw new Error('Fixture tab missing');
    await chrome.storage.local.set({ recordedSteps: [], recordingState: { isRecording: false } });
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url: targetUrl } });
  }, url);

  await sidePanel.getByRole('button', { name: 'Executar automação de passos' }).click();
  await expect(sidePanel.getByRole('combobox', { name: 'Campo de identificador' })).toBeVisible();
  await sidePanel.getByRole('combobox', { name: 'Campo de identificador' }).selectOption('input[id="phone"]');
  await sidePanel.getByRole('textbox', { name: 'Usuário de teste' }).fill('5511999999999');
  await expect(sidePanel.getByLabel('Senha de teste')).toHaveCount(0);
  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await expect(page.getByRole('status')).toHaveText('Identificador: 5511999999999');
  await expect(page.locator('#email')).toHaveCount(0);

  await sidePanel.getByRole('button', { name: 'Executar automação de passos' }).click();
  await expect(sidePanel.getByRole('combobox', { name: 'Campo de identificador' })).toHaveCount(0);
  await sidePanel.getByLabel('Senha de teste').fill('second-step-secret');
  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await expect(page.getByRole('status')).toHaveText('Login de teste enviado');

  const stored = await serviceWorker.evaluate(() => chrome.storage.local.get('recordedSteps'));
  expect(stored.recordedSteps.map((step: { type: string }) => step.type)).toEqual(['field-fill', 'click', 'field-fill', 'click']);
  expect(stored.recordedSteps[0].value).toEqual({ kind: 'plain', value: '5511999999999' });
  expect(stored.recordedSteps[2].value).toEqual({ kind: 'protected', reason: 'password' });
  expect(JSON.stringify(stored)).not.toContain('second-step-secret');

  const downloadPromise = sidePanel.waitForEvent('download');
  await sidePanel.getByRole('button', { name: 'Exportar Playwright' }).click();
  const download = await downloadPromise;
  const code = await readFile((await download.path())!, 'utf8');
  expect(code).toContain('TEST_PASSWORD');
  expect(code).not.toContain('TEST_USERNAME');
  expect(code).not.toContain('second-step-secret');
});
