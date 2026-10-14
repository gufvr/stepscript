import { expect, test } from './fixtures';

const url = 'http://127.0.0.1:4175/replay.html';
const selector = (value: string) => ({ recommended: {
  strategy: 'testId', value, score: 100, isUnique: true,
  validation: { status: 'valid', matchCount: 1, matchesTarget: true },
}, alternatives: [] });
const base = { id: 'replay', url, timestamp: 1 };
const steps = [
  { ...base, type: 'field-fill', schemaVersion: 5, selectors: selector('replay-email'), element: { tagName: 'input', inputType: 'email' }, value: { kind: 'plain', value: 'qa@example.test' } },
  { ...base, type: 'field-fill', schemaVersion: 5, selectors: selector('replay-email'), element: { tagName: 'input', inputType: 'password' }, value: { kind: 'protected', reason: 'password' } },
  { ...base, type: 'selection-change', schemaVersion: 6, selectors: selector('replay-choice'), control: { kind: 'select', multiple: false, selection: { kind: 'plain', options: [{ value: 'b', label: 'B' }] } } },
  { ...base, type: 'selection-change', schemaVersion: 6, selectors: selector('replay-check'), control: { kind: 'checkbox', checked: true } },
  { ...base, type: 'focus-navigation', schemaVersion: 4, selectors: selector('replay-action'), key: 'Tab', direction: 'forward' },
  { ...base, type: 'click', schemaVersion: 4, selectors: selector('replay-action') },
  { ...base, type: 'assertion', schemaVersion: 11, assertion: { kind: 'url', operator: 'equals', expected: url } },
  { ...base, type: 'assertion', schemaVersion: 12, selectors: selector('replay-message'), assertion: { kind: 'element', operator: 'visible' } },
  { ...base, type: 'assertion', schemaVersion: 13, selectors: selector('replay-message'), assertion: { kind: 'element', operator: 'text-equals', expected: 'Pronto para testar' } },
];

test('replays safe steps in the authorized tab without changing recordings', async ({ context, page, serviceWorker, extensionId }) => {
  await page.goto(url);
  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  await page.bringToFront();
  await serviceWorker.evaluate(async ({ url, steps }) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab.id || tab.windowId === undefined) throw new Error('Fixture tab missing');
    await chrome.storage.local.set({ recordedSteps: steps, recordingState: { isRecording: false } });
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url } });
  }, { url, steps });

  await expect(sidePanel.getByRole('button', { name: 'Executar automação de passos' })).toBeVisible();
  await sidePanel.getByRole('button', { name: 'Executar automação de passos' }).click();
  await sidePanel.getByRole('combobox', { name: 'Tipo de automação' }).selectOption('saved');
  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await expect(sidePanel.getByRole('dialog', { name: 'Confirmar execução de passos' })).toContainText('127.0.0.1');
  await sidePanel.getByRole('button', { name: 'Confirmar execução' }).click();
  await expect(sidePanel.getByRole('status').filter({ hasText: 'Execução concluída.' })).toBeVisible();
  await expect(page.getByTestId('replay-email')).toHaveValue('qa@example.test');
  await expect(page.getByTestId('replay-choice')).toHaveValue('b');
  await expect(page.getByTestId('replay-check')).toBeChecked();
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe('replay-action');
  expect(await page.locator('body').getAttribute('data-action')).toBeNull();
  const local = await serviceWorker.evaluate(() => chrome.storage.local.get(['recordedSteps', 'recordingState']));
  expect(local).toEqual({ recordedSteps: steps, recordingState: { isRecording: false } });

  await page.getByTestId('replay-email').fill('');
  const failing = [
    { ...base, id: 'wrong-url', type: 'assertion', schemaVersion: 11,
      assertion: { kind: 'url', operator: 'equals', expected: `${url}?wrong` } },
    steps[0],
  ];
  await serviceWorker.evaluate((recordedSteps) => chrome.storage.local.set({ recordedSteps }), failing);
  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await sidePanel.getByRole('button', { name: 'Confirmar execução' }).click();
  await expect(sidePanel.getByRole('status').filter({ hasText: 'A execução parou no primeiro erro.' })).toBeVisible();
  await expect(page.getByTestId('replay-email')).toHaveValue('');

  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await page.goto('http://127.0.0.1:4175/next.html');
  await sidePanel.getByRole('button', { name: 'Confirmar execução' }).click();
  await expect(sidePanel.getByRole('alert')).toContainText('confirmação expirou');
});
