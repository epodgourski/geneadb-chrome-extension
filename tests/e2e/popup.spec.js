import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(import.meta.dirname, '../../');

test.describe('Chrome Extension Popup', () => {
  let context;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('extension loads and popup opens', async () => {
    let extensionId;
    let sw = context.serviceWorkers()[0];
    if (!sw) {
      sw = await context.waitForEvent('serviceworker');
    }
    extensionId = sw.url().split('/')[2];

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.locator('h1')).toHaveText('Загрузчик документов');
    await expect(popup.locator('.version')).toContainText('Версия');
    await expect(popup.locator('#download-btn')).toBeVisible();
    await expect(popup.locator('#download-btn')).toBeDisabled();
  });

  test('shows error for unsupported URL', async () => {
    let sw = context.serviceWorkers()[0];
    if (!sw) sw = await context.waitForEvent('serviceworker');
    const extensionId = sw.url().split('/')[2];

    const page = await context.newPage();
    await page.goto('https://example.com');

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.locator('#url-display')).toContainText('не поддерживается', { timeout: 5000 });
    await expect(popup.locator('#download-btn')).toBeDisabled();
  });

  test('footer link points to geneadb.com', async () => {
    let sw = context.serviceWorkers()[0];
    if (!sw) sw = await context.waitForEvent('serviceworker');
    const extensionId = sw.url().split('/')[2];

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    const link = popup.locator('.footer a');
    await expect(link).toHaveAttribute('href', 'https://geneadb.com');
    await expect(link).toHaveText('geneadb.com');
  });
});
