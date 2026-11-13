import { chromium } from 'playwright';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origin = 'http://mtts.test';
let browser;
try {
  await mkdir('artifacts', { recursive: true });
  browser = await chromium.launch(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {});
  for (const config of [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, hasTouch: false },
    { name: 'tablet', viewport: { width: 900, height: 650 }, hasTouch: true },
  ]) {
    const { name, ...options } = config;
    const page = await browser.newPage(options);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(origin + '/**', (route) => {
      const file = new URL(route.request().url()).pathname.slice(1) || 'index.html';
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
      return route.fulfill({ path: resolve('dist', file), contentType: types[extname(file)] });
    });
    await page.goto(origin + '/');
    await page.getByRole('button', { name: 'Begin story' }).click();
    await page.locator('.visualBook').first().waitFor();
    const hand = page.getByRole('button', { name: /^Hand/ });
    const table = page.getByRole('region', { name: 'Book table' });
    const initial = await table.boundingBox();
    assert.equal(await hand.getAttribute('aria-expanded'), 'false');
    if (config.hasTouch) await hand.tap();
    else await hand.hover();
    await page.locator('.edge-bottom .gameCard').first().waitFor();
    assert.deepEqual(await table.boundingBox(), initial);
    if (config.hasTouch) await hand.tap();
    else await page.mouse.move(300, 45);
    await page.locator('.edge-bottom .gameCard').first().waitFor({ state: 'hidden' });
    const other = page.getByRole('button', { name: 'Other players' });
    if (config.hasTouch) await other.tap();
    else await other.hover();
    const opponents = page.getByRole('region', { name: 'Other players' });
    await opponents.getByText('Player 2', { exact: false }).first().waitFor();
    assert.equal(await opponents.locator('.hand .gameCard').count(), 0);
    if (config.hasTouch) await other.tap();
    else { await other.focus(); await page.keyboard.press('Escape'); }
    await page.locator('.pageDestination').first().click();
    await page.waitForFunction(() => document.querySelector('.turnStrip')?.textContent.includes('Player 1')
      && document.querySelector('.turnStrip')?.textContent.includes('Move your characters'));
    await page.locator('.pageDestination').first().click();
    await page.locator('.inkSpace.legalTarget, .overflowPlace').first().click();
    const bounds = await page.locator('.visualTable').boundingBox();
    for (const book of await page.locator('.visualBook').all()) {
      const box = await book.boundingBox();
      assert.ok(box.x >= bounds.x - 1 && box.y >= bounds.y - 1);
      assert.ok(box.x + box.width <= bounds.x + bounds.width + 1);
      assert.ok(box.y + box.height <= bounds.y + bounds.height + 1);
    }
    await page.screenshot({ path: 'artifacts/chapters-' + name + '.png' });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Desktop and tablet table, edge panels, and first placement passed.');
} finally {
  await browser?.close();
}
