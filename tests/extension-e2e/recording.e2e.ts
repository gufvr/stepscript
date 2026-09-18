import type { Worker } from '@playwright/test';
import { expect, test } from './fixtures';

const fixtureOrigin = 'http://127.0.0.1:4175';
const startUrl = `${fixtureOrigin}/start.html`;
const nextUrl = `${fixtureOrigin}/next.html`;

interface StoredRecordingState {
  isRecording?: boolean;
  currentUrl?: string;
  currentDocumentId?: string;
  recorderDocumentId?: string;
}

interface StoredStep {
  schemaVersion?: number;
  type?: string;
  url?: string;
  selectors?: {
    recommended?: {
      strategy?: string;
      value?: string;
      attribute?: string;
    };
  };
  assertion?: {
    kind?: string;
    operator?: string;
    expected?: string;
  };
}

interface StorageSnapshot {
  recordingState?: StoredRecordingState;
  recordedSteps?: StoredStep[];
}

async function readStorage(serviceWorker: Worker) {
  return serviceWorker.evaluate(async () => {
    return chrome.storage.local.get([
      'recordingState',
      'recordedSteps',
    ]) as Promise<StorageSnapshot>;
  });
}

test('records across a full navigation and resumes the real recorder', async ({
  context,
  extensionId,
  page,
  serviceWorker,
}) => {
  await page.goto(startUrl);

  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/index.html`);
  // The direct panel page is a test tab, unlike the native docked Side Panel.
  // Restore focus to the fixture before providing the action-context bridge.
  await page.bringToFront();

  await serviceWorker.evaluate(async (targetUrl) => {
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();

    const tabs = await chrome.tabs.query({});
    const targetTab = tabs.find((tab) => tab.url === targetUrl);

    if (
      targetTab?.id === undefined ||
      targetTab.windowId === undefined ||
      !targetTab.url
    ) {
      throw new Error('StepScript E2E: fixture tab context was not found.');
    }

    await chrome.storage.session.set({
      activeTabContext: {
        tabId: targetTab.id,
        windowId: targetTab.windowId,
        url: targetTab.url,
      },
    });
  }, startUrl);

  await expect(sidePanel.getByText('Status: Parado')).toBeVisible();
  await expect(sidePanel.getByText('0 passos capturados')).toBeVisible();

  await sidePanel.getByRole('button', { name: 'Iniciar Gravação' }).click();

  await expect(sidePanel.getByRole('status')).toContainText('Status: Gravando');
  await expect
    .poll(async () => (await readStorage(serviceWorker)).recordingState)
    .toMatchObject({ isRecording: true, currentUrl: startUrl });

  await Promise.all([
    page.waitForURL(nextUrl),
    page.getByTestId('continue-navigation').click(),
  ]);

  await expect
    .poll(async () => {
      const state = (await readStorage(serviceWorker)).recordingState;

      return Boolean(
        state?.currentDocumentId &&
          state.currentDocumentId === state.recorderDocumentId &&
          state.currentUrl === nextUrl,
      );
    })
    .toBe(true);

  await sidePanel
    .getByRole('button', { name: 'Verificar URL atual' })
    .click();
  await expect(sidePanel.getByText('3 passos capturados')).toBeVisible();
  await expect(
    sidePanel.getByText('Verificou que a URL é "/next.html"'),
  ).toBeVisible();

  await page.getByTestId('after-navigation').click();

  await expect(sidePanel.getByText('4 passos capturados')).toBeVisible();
  await expect(
    sidePanel.getByText('Clicou no link "Continuar"'),
  ).toBeVisible();
  await expect(sidePanel.getByText('Navegou para "/next.html"')).toBeVisible();
  await expect(
    sidePanel.getByText('Clicou no botão "Finalizar fluxo"'),
  ).toBeVisible();

  const snapshot = await readStorage(serviceWorker);
  const steps = snapshot.recordedSteps ?? [];

  expect(steps).toHaveLength(4);
  expect(steps.map(({ type }) => type)).toEqual([
    'click',
    'navigation',
    'assertion',
    'click',
  ]);
  expect(steps.map(({ schemaVersion }) => schemaVersion)).toEqual([
    4,
    10,
    11,
    4,
  ]);
  expect(steps.map(({ url }) => url)).toEqual([
    startUrl,
    nextUrl,
    nextUrl,
    nextUrl,
  ]);
  expect(steps[2]?.assertion).toEqual({
    kind: 'url',
    operator: 'equals',
    expected: nextUrl,
  });
  expect(steps[0]?.selectors?.recommended).toMatchObject({
    strategy: 'testId',
    value: 'continue-navigation',
    attribute: 'data-testid',
  });
  expect(steps[3]?.selectors?.recommended).toMatchObject({
    strategy: 'testId',
    value: 'after-navigation',
    attribute: 'data-testid',
  });
  expect(snapshot.recordingState).toMatchObject({
    isRecording: true,
    currentUrl: nextUrl,
  });
  expect(snapshot.recordingState?.currentDocumentId).toBeTruthy();
  expect(snapshot.recordingState?.recorderDocumentId).toBe(
    snapshot.recordingState?.currentDocumentId,
  );

  await sidePanel.getByRole('button', { name: 'Parar Gravação' }).click();

  await expect(sidePanel.getByText('Status: Parado')).toBeVisible();
  await expect
    .poll(async () => (await readStorage(serviceWorker)).recordingState)
    .toEqual({ isRecording: false });
});
