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
  await page.locator('.inkSpace.legalTarget').first().click();
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  assert.equal(await page.locator('.visualBook').count(), 3);
  for (const b of await page.locator('.visualBook').all()) {
    const boxes = await b.locator('.inkSpace').evaluateAll((es) =>
      es.map((e) => {
        const b = e.getBoundingClientRect();
        return { x: b.x, y: b.y };
      }),
    );
    assert.ok(
      boxes.every((b, i) => i === 0 || b.x > boxes[i - 1].x),
      'Spaces must increase left to right',
    );
    assert.ok(
      Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)) < 2,
      'Spaces must share one horizontal line',
    );
  }
  await page.screenshot({ path: 'artifacts/chapters-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: /Reveal my hand/ }).click();
  assert.ok(await page.getByRole('button', { name: /^Place (in space|in overflow)/ }).count());
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.screenshot({ path: 'artifacts/chapters-tablet.png', fullPage: true });
  // Readable overflow fixture, using the same private save format as real play.
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('mtts-chapters-1'));
    const s = saved.game;
    s.books[0].overflow = [3, 2];
    for (let p = 0; p < 2; p++)
      s.players[p].supply =
        12 - s.books.reduce((n, b) => n + b.overflow[p] + b.slots.filter((x) => x === p).length, 0);
    localStorage.setItem('mtts-chapters-1', JSON.stringify({ game: s, history: [] }));
  });
  await page.getByRole('button', { name: 'New story', exact: true }).click();
  await page.getByRole('button', { name: 'Load local story', exact: true }).click();
  assert.equal(await page.locator('.overflowPieces .meeple').count(), 5);
  await page
    .getByRole('button', { name: /Inspect .* effect/ })
    .first()
    .click();
  await page.screenshot({ path: 'artifacts/tabletop-overflow-tablet.png', fullPage: true });
  await page.setViewportSize({ width: 1500, height: 1100 });
  await page.getByRole('button', { name: 'Fit table', exact: true }).click();
  await page.screenshot({ path: 'artifacts/tabletop-desktop.png', fullPage: true });
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
