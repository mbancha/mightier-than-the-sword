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
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } }),
    page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('http://127.0.0.1:4178');
  await page.getByLabel('Shuffle seed').fill('29');
  await page.getByLabel('Player 2 controller').selectOption('human');
  await page.screenshot({ path: 'artifacts/setup-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Begin story', exact: true }).click();
  async function reveal() {
    const b = page.getByRole('button', { name: /reveal my hand/ });
    if (await b.count()) await b.click();
  }
  async function allActions() {
    await reveal();
    const d = page.locator('.fallbackActions');
    if ((await d.count()) && (await d.getAttribute('open')) === null)
      await d.locator('summary').click();
  }
  async function choose(index = 0) {
    await allActions();
    await page.locator('.actionList button').nth(index).click();
    await page.getByRole('button', { name: 'Confirm choice', exact: true }).click();
  }
  await choose();
  await choose(2);
  await reveal();
  assert.equal(await page.locator('.mapBook').count(), 3);
  const coords = await page
    .locator('.mapBook')
    .evaluateAll((es) =>
      es.map((e) => ({ x: parseFloat(e.style.left), y: parseFloat(e.style.top) })),
    );
  assert.equal(coords[0].y, coords[1].y);
  assert.equal(coords[2].x, (coords[0].x + coords[1].x) / 2);
  assert.ok(coords[2].y > coords[0].y);
  assert.equal(await page.locator('.playerSubplot[open]').count(), 2);
  assert.equal(await page.locator('.playerSubplot p:visible').count(), 4);
  // Actual pointer drag of the protagonist, then its contextual end-move menu.
  let figure = page.getByRole('button', { name: 'Teal protagonist', exact: true });
  await figure.click();
  assert.ok((await page.locator('.legalPage').count()) > 0);
  assert.equal(
    await page.locator('.mapPopup').getByRole('button', { name: 'End move', exact: true }).count(),
    0,
  );
  await page.getByRole('button', { name: 'Close piece menu' }).click();
  const src = await figure.boundingBox(),
    target = await page.locator('[data-page="1"] .pageLabel').boundingBox();
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
  await page.mouse.up();
  assert.equal(
    await page
      .locator('[data-page="1"]')
      .getByRole('button', { name: 'Teal protagonist', exact: true })
      .count(),
    1,
  );
  await figure.click();
  await page.locator('.mapPopup').getByRole('button', { name: 'End move', exact: true }).click();
  await page.locator('.legalSlot.slot').first().click();
  assert.equal(await page.locator('.mapBook .piece').count(), 1);
  assert.equal(await page.locator('.trackLevel').count(), 32);
  assert.equal(await page.locator('.slotReward').count(), 6);
  // Zoom and pan affect the camera, not game state.
  const oldZoom = await page.getByLabel('Map zoom').innerText();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  assert.notEqual(await page.getByLabel('Map zoom').innerText(), oldZoom);
  const box = await page.locator('.mapViewport').boundingBox(),
    before = await page.locator('.mapCanvas').getAttribute('style');
  await page.mouse.move(box.x + 8, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + 75, box.y + 60, { steps: 6 });
  await page.mouse.up();
  assert.notEqual(await page.locator('.mapCanvas').getAttribute('style'), before);
  await page.getByRole('button', { name: 'Fit map', exact: true }).click();
  await page.screenshot({ path: 'artifacts/table-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await reveal();
  await page.locator('.legalSlot.slot').first().click();
  // Card actions originate from the card itself, including non-playable cards.
  await page.locator('.handCard').first().click();
  assert.equal(await page.locator('.pieceDialog').count(), 1);
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  await page.getByRole('button', { name: 'Spectator view', exact: true }).click();
  assert.equal(await page.locator('.hand').count(), 0);
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
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.setViewportSize({ width: 1600, height: 1100 });
  async function directMove(name, pageNumber) {
    await reveal();
    const fig = page.getByRole('button', { name: name + ' protagonist', exact: true });
    await fig.click();
    await page.locator(`[data-page="${pageNumber}"] .pageLabel`).click();
    await fig.click();
    await page.locator('.mapPopup').getByRole('button', { name: 'End move', exact: true }).click();
  }
  async function finishTurn() {
    await page
      .locator('.quickChoices')
      .getByRole('button', { name: 'End turn', exact: true })
      .click();
  }
  await finishTurn();
  await directMove('Amber', 3);
  await page.locator('[data-book="1"] .slot').nth(1).click();
  await finishTurn();
  await directMove('Teal', 0);
  await page.locator('[data-book="0"] .slot').nth(0).click();
  await finishTurn();
  await directMove('Amber', 2);
  await page.locator('[data-book="1"] .slot').nth(0).click();
  await finishTurn();
  await directMove('Teal', 1);
  await page.locator('[data-book="0"] .slot').nth(2).click();
  await page
    .locator('.mapPopup')
    .getByRole('button', { name: /Valor memory/ })
    .click();
  assert.equal(
    await page
      .locator('.player')
      .first()
      .getByRole('button', { name: 'Valor 1/3', exact: true })
      .count(),
    1,
  );
  assert.equal(await page.locator('.mapBook .memory').count(), 1);
  await page.screenshot({ path: 'artifacts/upgrades-desktop.png', fullPage: true });
  report.memoryClick = true;
  let choices = 0,
    scanned = false,
    published = false;
  while (
    !(await page.getByRole('heading', { name: 'Fin', exact: true }).count()) &&
    choices++ < 900
  ) {
    await allActions();
    const list = page.locator('.actionList button'),
      texts = await list.allTextContents();
    let index = -1;
    const prompt = await page.locator('.choices h2').innerText();
    if (prompt.startsWith('Your Inkling') && !scanned) {
      assert.equal(await page.locator('.scanSlot').count(), 1);
      await page.screenshot({ path: 'artifacts/conflict-scan.png', fullPage: true });
      scanned = true;
    }
    if (prompt.startsWith('Move your figure')) {
      const book = page.locator('.mapBook').first(),
        title = await book.locator('h3').innerText();
      for (let side = 0; side < 2; side++) {
        const slots = book.locator('.page').nth(side).locator('.slot');
        if (
          (await slots.count()) > (await book.locator('.page').nth(side).locator('.piece').count())
        ) {
          index = texts.findIndex(
            (t) =>
              !t.startsWith('Step') && t.includes(title) && t.includes(side ? 'right' : 'left'),
          );
          if (index >= 0) break;
        }
      }
      if (index < 0) index = texts.findIndex((t) => t.startsWith('Stay'));
    }
    if (prompt.startsWith('Place the drawn book')) {
      await page.getByTestId('publish-site').first().click();
      published = true;
      continue;
    }
    if (prompt.startsWith('Place an Inkling in a neighboring')) {
      await page.locator('.overflow.legalSlot').first().click();
      continue;
    }
    if (index < 0) index = texts.findIndex((t) => t === 'End turn');
    if (index < 0) index = texts.findIndex((t) => t === 'Place Inklings');
    if (index < 0) index = texts.findIndex((t) => t === 'Pass this space');
    if (index < 0 && prompt.startsWith('Choose an Inkling to erase'))
      index = texts.findIndex((t) => t === 'Skip this optional effect');
    if (index < 0)
      index = texts.findIndex(
        (t) => t.includes('Complete Subplot') && t.includes('draw a character'),
      );
    assert.ok(texts.length, `No legal choices: ${prompt}`);
    await choose(Math.max(0, index));
  }
  assert.ok(choices < 900);
  assert.ok(published, 'Conflict should publish a new book');
  assert.ok(scanned, 'Conflict scan is visible');
  await page.screenshot({ path: 'artifacts/result-desktop.png', fullPage: true });
  await page.locator('.log summary').click();
  const log = await page.locator('.log').innerText();
  report = {
    ...report,
    choices,
    conflicts: (log.match(/Conflict at/g) || []).length,
    books: await page.locator('.mapBook').count(),
    result: await page.locator('.ending').innerText(),
  };
  // Independent real bot game: leave one human; bots proceed with private cards hidden.
  const botPage = await context.newPage();
  await botPage.goto('http://127.0.0.1:4178');
  await botPage.getByLabel('Shuffle seed').fill('14');
  await botPage.getByRole('button', { name: 'Begin story', exact: true }).click();
  await botPage.getByLabel('Bot speed').selectOption('150');
  await botPage.locator('[data-page="0"] .pageLabel').click();
  await botPage.getByRole('button', { name: 'Teal protagonist', exact: true }).waitFor();
  await botPage.waitForFunction(() => !document.querySelector('.botStatus'));
  assert.equal(await botPage.locator('.handoff').count(), 0);
  await botPage.getByRole('button', { name: 'Teal protagonist', exact: true }).click();
  await botPage.locator('[data-page="1"] .pageLabel').click();
  await botPage.getByRole('button', { name: 'Teal protagonist', exact: true }).click();
  await botPage.locator('.mapPopup').getByRole('button', { name: 'End move', exact: true }).click();
  await botPage.locator('.legalSlot.slot').first().click();
  await botPage
    .locator('.quickChoices')
    .getByRole('button', { name: 'End turn', exact: true })
    .click();
  await botPage.waitForFunction(() =>
    document.querySelector('.toolbar strong')?.textContent.includes('Turn 3'),
  );
  assert.equal(await botPage.locator('.hand').count(), 1);
  assert.equal(await botPage.locator('.handoff').count(), 0);
  await botPage.getByRole('button', { name: 'Pause bots', exact: true }).click();
  await botPage.screenshot({ path: 'artifacts/bot-game.png', fullPage: true });
  report.botTurn = true;
  report.memoryClick = true;
  assert.deepEqual(errors, []);
  assert.equal(
    report.accessibility.filter((v) => ['serious', 'critical'].includes(v.impact)).length,
    0,
  );
  console.log(JSON.stringify({ ...report, errors }, null, 2));
} finally {
  await writeFile('artifacts/browser-report.json', JSON.stringify({ ...report, errors }, null, 2));
  await browser.close();
  await server.httpServer.close();
}
