import type { Page, Worker } from '@playwright/test';
import { expect, test } from './fixtures';

const origin = 'http://127.0.0.1:4175';
const url = `${origin}/guided.html`;
const outline = '[data-stepscript-guided-highlight]';

async function authorize(worker: Worker, targetUrl: string) {
  await worker.evaluate(async (value) => {
    const tab = (await chrome.tabs.query({})).find((item) => item.url === value);
    if (tab?.id === undefined) throw new Error('Fixture tab missing');
    await chrome.storage.session.set({ activeTabContext: { tabId: tab.id, windowId: tab.windowId, url: value } });
  }, targetUrl);
}
async function saved(worker: Worker) {
  return worker.evaluate(async () => (await chrome.storage.local.get('recordedSteps')).recordedSteps ?? []);
}
async function start(page: Page, panel: Page, worker: Worker) {
  await page.bringToFront(); await authorize(worker, url);
  await panel.getByRole('checkbox', { name: /Gravação guiada/ }).check();
  await panel.getByRole('button', { name: 'Iniciar Gravação' }).click();
  await expect(panel.getByRole('region', { name: 'Gravação guiada' })).toBeVisible();
}

test('guided captures update live, protect values, highlight without focus, pause, resume and review without actions', async ({ page, context, extensionId, serviceWorker }) => {
  await page.goto(url);
  const panel = await context.newPage(); await panel.goto(`chrome-extension://${extensionId}/index.html`);
  await start(page, panel, serviceWorker);
  const guided = panel.getByRole('region', { name: 'Gravação guiada' });
  await page.getByTestId('guided-email').click();
  await expect(page.locator(outline)).toBeVisible();
  await expect(guided).toContainText('Passo 1 de 1');
  await expect(page.getByTestId('guided-email')).toBeFocused();
  await expect(page.locator(outline)).toHaveCSS('pointer-events', 'none');
  await page.getByTestId('guided-email').fill('qa@example.test'); await page.keyboard.press('Tab');
  await page.getByTestId('guided-password').fill('QA_GUIDED_SECRET'); await page.keyboard.press('Tab');
  await expect.poll(async () => JSON.stringify(await saved(serviceWorker))).toContain('protected');
  expect(JSON.stringify(await saved(serviceWorker))).not.toContain('QA_GUIDED_SECRET');
  expect(await page.locator(outline).textContent()).toBe('');
  await guided.getByRole('button', { name: 'Pausar gravação' }).click();
  await expect(page.locator(outline)).toHaveCount(0);
  const paused = await saved(serviceWorker);
  await page.getByTestId('guided-email').fill('ignored@example.test'); await page.keyboard.press('Tab');
  expect(await saved(serviceWorker)).toEqual(paused);
  await guided.getByRole('button', { name: 'Retomar gravação' }).click();
  await page.getByTestId('guided-next').click();
  await page.getByTestId('guided-city').click();
  await expect(page.locator(outline)).toBeVisible();
  const beforeReview = await saved(serviceWorker);
  await guided.getByRole('button', { name: 'Revisar passos' }).click();
  await guided.getByRole('button', { name: 'Avançar passo' }).click();
  expect(await saved(serviceWorker)).toEqual(beforeReview);
  await expect(page.getByTestId('guided-city')).toHaveValue('');
  await guided.getByRole('button', { name: 'Retomar gravação' }).click();
  await page.getByTestId('guided-city').click();
  await expect(page.locator(outline)).toBeVisible();
  await page.evaluate(() => document.querySelector('#city')?.remove());
  await expect(page.locator(outline)).toHaveCount(0);
  await expect(guided.getByRole('status')).toContainText('removido ou ocultado');
  await guided.getByRole('button', { name: 'Encerrar gravação' }).click();
  await expect(panel.getByText('Status: Parado')).toBeVisible();
  await expect(page.locator(outline)).toHaveCount(0);
});

test('navigation clears old outlines, keeps pause across documents and resumes without replaying skipped navigation', async ({ page, context, extensionId, serviceWorker }) => {
  await page.goto(url);
  const panel = await context.newPage(); await panel.goto(`chrome-extension://${extensionId}/index.html`);
  await start(page, panel, serviceWorker);
  const guided = panel.getByRole('region', { name: 'Gravação guiada' });
  await page.getByTestId('guided-email').click(); await expect(page.locator(outline)).toBeVisible();
  await page.evaluate(() => history.pushState({}, '', '#stage-two'));
  await expect(page.locator(outline)).toHaveCount(0);
  await expect.poll(async () => (await saved(serviceWorker)).some((step: { type: string }) => step.type === 'navigation')).toBe(true);
  await guided.getByRole('button', { name: 'Pausar gravação' }).click();
  const paused = await saved(serviceWorker);
  await page.goto(`${origin}/next.html`);
  await page.getByTestId('after-navigation').click();
  expect(await saved(serviceWorker)).toEqual(paused);
  await authorize(serviceWorker, `${origin}/next.html`);
  await guided.getByRole('button', { name: 'Retomar gravação' }).click();
  await page.getByTestId('after-navigation').click();
  await expect(page.locator(outline)).toBeVisible();
  await expect.poll(async () => (await saved(serviceWorker)).length).toBe(paused.length + 1);
  await guided.getByRole('button', { name: 'Revisar passos' }).click();
  await expect(page.locator(outline)).toHaveCount(0);
  await expect(guided.getByRole('status')).toContainText('outra página');
  await guided.getByRole('button', { name: 'Encerrar gravação' }).click();
});

test('tab switch, origin change and closing a tab safely pause guided capture', async ({ page, context, extensionId, serviceWorker }) => {
  await page.goto(url);
  const panel = await context.newPage(); await panel.goto(`chrome-extension://${extensionId}/index.html`);
  await start(page, panel, serviceWorker);
  const guided = panel.getByRole('region', { name: 'Gravação guiada' });
  await page.getByTestId('guided-email').click(); await expect(page.locator(outline)).toBeVisible();
  const other = await context.newPage(); await other.goto(`${origin}/next.html`); await other.bringToFront();
  await expect(guided.getByRole('status')).toContainText('aba ativa mudou');
  await expect(page.locator(outline)).toHaveCount(0);
  await guided.getByRole('button', { name: 'Retomar gravação' }).click();
  await expect(guided.getByRole('alert')).toContainText('Reabra o StepScript');
  await page.bringToFront(); await authorize(serviceWorker, url);
  await guided.getByRole('button', { name: 'Retomar gravação' }).click();
  await page.goto('http://localhost:4175/next.html');
  await expect(guided.getByRole('status')).toContainText('origem mudou');
  const before = await saved(serviceWorker);
  await page.getByTestId('after-navigation').click(); expect(await saved(serviceWorker)).toEqual(before);
  await page.close();
  await expect(guided.getByRole('status')).toContainText('aba foi fechada');
  await guided.getByRole('button', { name: 'Encerrar gravação' }).click();
});
