import { expect, test } from './fixtures';

test.use({ pregrantFixtureOrigin: false });

test('does not prepare replay without authorization for the current site', async ({ context, page, serviceWorker, extensionId }) => {
  const url = 'http://127.0.0.1:4175/replay.html';
  await page.goto(url);
  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  await page.bringToFront();
  const step = { id: 'url', schemaVersion: 11, type: 'assertion', url, timestamp: 1,
    assertion: { kind: 'url', operator: 'equals', expected: url } };
  await serviceWorker.evaluate(async ({ url, step }) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab.id || tab.windowId === undefined) throw new Error('Fixture tab missing');
    await chrome.storage.local.set({ recordedSteps: [step], recordingState: { isRecording: false } });
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url } });
  }, { url, step });
  await sidePanel.getByRole('button', { name: 'Executar automação de passos' }).click();
  await sidePanel.getByRole('combobox', { name: 'Tipo de automação' }).selectOption('saved');
  await sidePanel.getByRole('button', { name: 'Confirmar e executar' }).click();
  await expect(sidePanel.getByRole('alert')).toContainText('aba autorizada');
  await expect(sidePanel.getByRole('dialog', { name: 'Confirmar execução de passos' })).toHaveCount(0);
  expect(await serviceWorker.evaluate(() => chrome.storage.local.get('recordedSteps'))).toEqual({ recordedSteps: [step] });
});
