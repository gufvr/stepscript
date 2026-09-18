import {
  test as base,
  type BrowserContext,
  type Worker,
} from '@playwright/test';
import { resolve } from 'node:path';

interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  serviceWorker: Worker;
  pregrantFixtureOrigin: boolean;
}

const extensionPath = resolve(
  import.meta.dirname,
  '..',
  '..',
  'test-results',
  'extension-e2e',
  'unpacked',
);

export const test = base.extend<ExtensionFixtures>({
  pregrantFixtureOrigin: [true, { option: true }],
  context: async ({ playwright, pregrantFixtureOrigin }, provide) => {
    const path = pregrantFixtureOrigin ? extensionPath : resolve(extensionPath, '..', 'optional-unpacked');
    const context = await playwright.chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${path}`,
        `--load-extension=${path}`,
      ],
      timeout: 15_000,
    });

    await provide(context);
    await context.close();
  },

  serviceWorker: async ({ context }, provide) => {
    let [serviceWorker] = context.serviceWorkers();

    serviceWorker ??= await context.waitForEvent('serviceworker', {
      timeout: 10_000,
    });
    await provide(serviceWorker);
  },

  extensionId: async ({ serviceWorker }, provide) => {
    const extensionId = new URL(serviceWorker.url()).hostname;
    await provide(extensionId);
  },
});

export const expect = test.expect;
