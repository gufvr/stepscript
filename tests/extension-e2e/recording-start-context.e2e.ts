import { expect, test } from './fixtures';

test.use({ pregrantFixtureOrigin: false });

test('rejects stale context without pre-granted host access or changing existing recordings', async ({ context, page, serviceWorker, extensionId }) => {
  await page.goto('http://127.0.0.1:4175/start.html');
  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  await page.bringToFront();

  const original = {
    schemaVersion: 1, id: 'existing-step', type: 'click', timestamp: 1,
    url: 'https://example.com/form', selector: '#existing', element: { tagName: 'button' },
  };
  const targetTabId = await serviceWorker.evaluate(async (original) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab.id || tab.windowId === undefined) throw new Error('Fixture tab not found');
    const permissions = await chrome.permissions.getAll();
    if (permissions.origins?.length) throw new Error('Unexpected pre-granted origin');
    await chrome.storage.local.set({ recordedSteps: [original], recordingState: { isRecording: false } });
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url: 'https://example.com/form' } });
    return tab.id;
  }, original);

  await sidePanel.getByRole('button', { name: 'Iniciar Gravação' }).click();
  await expect(sidePanel.getByRole('alert')).toHaveText('Reabra o StepScript pelo ícone na aba que deseja gravar.');
  await expect(sidePanel.getByText('Status: Parado')).toBeVisible();
  const state = await serviceWorker.evaluate(async () => ({
    local: await chrome.storage.local.get(['recordedSteps', 'recordingState']),
    session: await chrome.storage.session.get('activeTabContext'),
    permissions: await chrome.permissions.getAll(),
  }));
  expect(state.local).toEqual({ recordedSteps: [original], recordingState: { isRecording: false } });
  expect(state.session.activeTabContext).toBeNull();
  expect(state.permissions.origins ?? []).toEqual([]);

  // Closing the originally captured tab must also leave the recording untouched.
  await serviceWorker.evaluate((tabId) => chrome.tabs.remove(tabId), targetTabId);
  await sidePanel.getByRole('button', { name: 'Iniciar Gravação' }).click();
  await expect(sidePanel.getByRole('alert')).toHaveText('Reabra o StepScript pelo ícone na aba que deseja gravar.');
  expect(await serviceWorker.evaluate(() => chrome.storage.local.get('recordedSteps'))).toEqual({ recordedSteps: [original] });
});
