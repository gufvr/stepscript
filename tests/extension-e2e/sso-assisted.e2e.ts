import { expect, test } from './fixtures';

test('reviews and confirms SSO once, records sanitized source action and observes return by URL only', async ({ context, page, serviceWorker, extensionId }) => {
  const sourceUrl = 'http://127.0.0.1:4175/sso.html';
  await context.route('https://accounts.google.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Mock identity provider</title>' }));
  await page.goto(sourceUrl);
  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  await sidePanel.bringToFront();
  await page.bringToFront();
  await serviceWorker.evaluate(async (targetUrl) => {
    const [tab] = await chrome.tabs.query({ url: 'http://127.0.0.1:4175/sso.html' });
    if (!tab?.id || tab.windowId === undefined) throw new Error('Fixture tab missing');
    await chrome.storage.local.set({ recordedSteps: [], recordingState: { isRecording: false } });
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url: targetUrl } });
  }, sourceUrl);

  const reviewed = await sidePanel.evaluate(() => chrome.runtime.sendMessage({ type: 'INSPECT_SSO_AUTOMATION' }));
  expect(reviewed.success).toBe(true);
  expect(reviewed.ssoOptions[0]).toMatchObject({ provider: 'Google', canStart: true,
    destination: 'https://accounts.google.com/o/oauth2/v2/auth' });
  expect(JSON.stringify(reviewed)).not.toMatch(/do-not-record|client_id/);
  const before = await serviceWorker.evaluate(() => chrome.storage.local.get('recordedSteps'));
  expect(before.recordedSteps).toEqual([]);

  const started = await sidePanel.evaluate(({ option, documentId }) => chrome.runtime.sendMessage({
    type: 'START_SSO_AUTOMATION', payload: { fingerprint: option.fingerprint, destination: option.destination, documentId },
  }), { option: reviewed.ssoOptions[0], documentId: reviewed.ssoDocumentId });
  expect(started.success).toBe(true);
  await expect.poll(() => page.locator('html').getAttribute('data-sso-clicked')).toBe('1');
  const afterStart = await serviceWorker.evaluate(() => chrome.storage.local.get('recordedSteps'));
  expect(afterStart.recordedSteps).toHaveLength(1);
  expect(afterStart.recordedSteps[0]).toMatchObject({ type: 'click', element: { text: 'Continue with Google' } });
  expect(JSON.stringify(afterStart)).not.toMatch(/do-not-record|client_id|accounts\.google/);

  // Simulate an external provider navigation and trusted callback URL without reading provider content.
  await page.goto('https://accounts.google.com/mock-authentication');
  const outside = await sidePanel.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_SSO_FLOW_STATUS' }));
  expect(outside.ssoFlow.phase).toBe('external');
  await page.goto('http://127.0.0.1:4175/sso.html?code=private-return');
  const flow = await sidePanel.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_SSO_FLOW_STATUS' }));
  expect(flow.ssoFlow.phase).toBe('returned');
  const finalStorage = await serviceWorker.evaluate(() => chrome.storage.local.get('recordedSteps'));
  expect(finalStorage.recordedSteps.map((step: { type: string }) => step.type)).toEqual(['click', 'navigation']);
  expect(JSON.stringify(finalStorage)).not.toMatch(/private-return|do-not-record|client_id|accounts\.google/);
});

test('inspection without confirmation leaves the source page and recorded steps unchanged', async ({ context, page, serviceWorker, extensionId }) => {
  const sourceUrl = 'http://127.0.0.1:4175/sso.html';
  await page.goto(sourceUrl);
  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  await sidePanel.bringToFront();
  await page.bringToFront();
  await serviceWorker.evaluate(async (targetUrl) => {
    const [tab] = await chrome.tabs.query({ url: 'http://127.0.0.1:4175/sso.html' });
    if (!tab?.id || tab.windowId === undefined) throw new Error('Fixture tab missing');
    await chrome.storage.local.set({ recordedSteps: [], recordingState: { isRecording: false } });
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url: targetUrl } });
  }, sourceUrl);
  const inspected = await sidePanel.evaluate(() => chrome.runtime.sendMessage({ type: 'INSPECT_SSO_AUTOMATION' }));
  expect(inspected.success).toBe(true);
  const stored = await serviceWorker.evaluate(() => chrome.storage.local.get('recordedSteps'));
  expect(stored.recordedSteps).toEqual([]);
  await expect(page).toHaveURL(sourceUrl);
});
