import { chromium } from 'playwright';
import { preview } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts', { recursive: true });
const server = await preview({ preview: { port: 4178, host: '127.0.0.1', strictPort: true } });
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4178');
  await page.getByLabel('Player 2 controller').selectOption('human');
  await page.getByRole('button', { name: 'Begin story', exact: true }).click();
  await page.getByRole('button', { name: /Reveal my hand/ }).click();
  await page
    .getByRole('button', { name: /Start on/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Reveal my hand/ }).click();
  await page
    .getByRole('button', { name: /Start on/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Reveal my hand/ }).click();
  await page.getByRole('button', { name: 'Begin movement', exact: true }).click();
  await page
    .getByRole('button', { name: /^Move / })
    .first()
    .click();
  await page.getByRole('button', { name: 'Finish this character movement', exact: true }).click();
  for (let i = 0; i < 12; i++) {
    const source = page.getByRole('button', { name: /^Place from / });
    if (await source.count()) {
      await source.first().click();
      break;
    }
    const skip = page.getByRole('button', { name: 'Continue without this benefit', exact: true });
    if (await skip.count()) await skip.click();
    else await page.locator('.chapterActions button').first().click();
  }
  await page
    .getByRole('button', { name: /^Place (in space|in overflow)/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  assert.equal(await page.locator('.chapterBook').count(), 3);
  await page.screenshot({ path: 'artifacts/chapters-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: /Reveal my hand/ }).click();
  assert.ok(await page.getByRole('button', { name: /^Place (in space|in overflow)/ }).count());
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.screenshot({ path: 'artifacts/chapters-tablet.png', fullPage: true });
  assert.deepEqual(errors, []);
  await writeFile(
    'artifacts/chapter-smoke.json',
    JSON.stringify(
      {
        passed: true,
        errors,
        journeys: [
          'setup',
          'private handoffs',
          'movement',
          'placement',
          'save',
          'undo',
          'desktop',
          'tablet',
        ],
      },
      null,
      2,
    ),
  );
  console.log('Chapter browser journeys passed.');
} finally {
  await browser?.close();
  await server.httpServer.close();
}
