import { chromium } from 'playwright';
import { preview } from 'vite';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts', { recursive: true });
const server = await preview({ preview: { port: 4178, host: '127.0.0.1', strictPort: true } });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const errors = [];
let report = {};
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('http://127.0.0.1:4178');
  await page.getByLabel('Shuffle seed').fill('29');
  await page.screenshot({ path: 'artifacts/setup-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Begin story', exact: true }).click();
  async function reveal() {
    const button = page.getByRole('button', { name: /reveal my hand/ });
    if (await button.count()) await button.click();
  }
  async function choose(label) {
    await reveal();
    const loc = label
      ? page.locator('.actionList button').filter({ hasText: label }).first()
      : page.locator('.actionList button').first();
    await loc.click();
    await page.getByRole('button', { name: 'Confirm choice', exact: true }).click();
  }
  // Two setup decisions, then ordinary movement; everything uses visible controls.
  await choose();
  await choose();
  await reveal();
  await page.locator('.actionList button').first().click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.locator('.confirmation').count(), 0);
  await choose();
  await choose('Place Inklings');
  await choose();
  await page.screenshot({ path: 'artifacts/table-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await reveal();
  await choose(); // replace the undone Inkling
  await page.getByRole('button', { name: 'Spectator view', exact: true }).click();
  assert.equal(await page.locator('.hand').count(), 0);
  assert.equal(await page.locator('.actionList').count(), 0);
  await page.getByRole('button', { name: 'Return to players', exact: true }).click();
  await reveal();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  report.accessibility = axe.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
  }));
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.screenshot({ path: 'artifacts/table-tablet.png', fullPage: true });
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'Tablet horizontal overflow',
  );
  await page.setViewportSize({ width: 1600, height: 1050 });
  let choices = 0;
  while (
    (await page.getByRole('heading', { name: 'Fin', exact: true }).count()) === 0 &&
    choices++ < 650
  ) {
    await reveal();
    // Prefer ordinary placements and passing to run a whole game deterministically.
    const list = page.locator('.actionList button');
    const texts = await list.allTextContents();
    let index = -1;
    if ((await page.locator('.choices h2').innerText()).startsWith('Choose where')) {
      const firstBook = page.locator('.book').first();
      const title = await firstBook.locator('h3').innerText();
      const sides = firstBook.locator('.page');
      for (let side = 0; side < 2; side++) {
        const empty =
          (await sides.nth(side).locator('.slot').count()) -
          (await sides.nth(side).locator('.piece').count());
        if (empty) {
          index = texts.findIndex(
            (t) => t.includes(title) && t.includes(side === 0 ? 'left' : 'right'),
          );
          if (index >= 0) break;
        }
      }
    }
    if (index < 0) index = texts.findIndex((t) => t === 'Resolve full books and end turn');
    if (index < 0) index = texts.findIndex((t) => t === 'Place Inklings');
    if (index < 0) index = texts.findIndex((t) => t === 'Pass on a Twist');
    if (
      index < 0 &&
      (await page.locator('.choices h2').innerText()).startsWith('Choose an Inkling to erase')
    )
      index = texts.findIndex((t) => t === 'Skip this optional effect');
    if (index < 0)
      index = texts.findIndex(
        (t) => t.includes('Complete Subplot') && t.includes('draw a character'),
      );
    if (index < 0) index = 0;
    assert.ok(texts.length, 'No visible legal choices');
    await list.nth(index).click();
    await page.getByRole('button', { name: 'Confirm choice', exact: true }).click();
  }
  assert.ok(choices < 650, 'Whole-game browser journey did not finish');
  await page.screenshot({ path: 'artifacts/result-desktop.png', fullPage: true });
  await page.locator('.log summary').click();
  const log = await page.locator('.log').innerText();
  assert.match(
    log,
    /Conflict at/,
    'Must exercise an actual conflict, not only shoot-the-moon endings',
  );
  report = {
    ...report,
    choices,
    result: await page.locator('.ending').innerText(),
    conflicts: (log.match(/Conflict at/g) || []).length,
    errors,
  };
  assert.deepEqual(errors, [], 'Browser errors');
  assert.equal(
    report.accessibility.filter((v) => ['serious', 'critical'].includes(v.impact)).length,
    0,
    'Serious accessibility violations',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile('artifacts/browser-report.json', JSON.stringify({ ...report, errors }, null, 2));
  await browser.close();
  await server.httpServer.close();
}
