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
  await page.getByRole('button', { name: 'Begin story', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: /Pass to|Reveal my hand|Begin movement/ }).count(),
    0,
  );
  await page.locator('.pageDestination').first().click();
  await page.getByRole('heading', { name: /Player 1 · Move your characters/ }).waitFor();
  await page.locator('.pageDestination').first().click();
  for (let i = 0; i < 12; i++) {
    if (await page.locator('.inkSpace.legalTarget').count()) break;
    const skip = page.locator('.choices > .chapterActions button');
    const primary = page.locator('.choices .chapterActions').first();
    const pass = primary.getByRole('button', {
      name: 'Continue without this benefit',
      exact: true,
    });
    if (await pass.count()) await pass.click();
    else await primary.locator('button').first().click();
  }
  await page.locator('.inkSpace.legalTarget').first().click();
  for (const b of await page.locator('.visualBook').all()) {
    const boxes = await b.locator('.inkSpace').evaluateAll((es) =>
      es.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y };
      }),
    );
    assert.ok(boxes.every((b, i) => !i || b.x > boxes[i - 1].x));
    assert.ok(Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)) < 2);
  }
  await page.screenshot({ path: 'artifacts/smooth-desktop.png', fullPage: true });
  // Finish human choices; bot must respond and hand control back without Resume/Reveal clicks.
  for (let i = 0; i < 15; i++) {
    const end = page
      .locator('.choices .chapterActions')
      .first()
      .getByRole('button', { name: 'End turn', exact: true });
    if (await end.count()) {
      await end.click();
      break;
    }
    const skip = page
      .locator('.choices .chapterActions')
      .first()
      .getByRole('button', { name: 'Continue without this benefit', exact: true });
    if (await skip.count()) await skip.click();
    else break;
  }
  await page
    .getByRole('heading', { name: /Player 1 · Move your characters · Turn 3/ })
    .waitFor({ timeout: 20000 });
  assert.equal(
    await page.getByRole('button', { name: /Reveal my hand|Pass to|Begin movement/ }).count(),
    0,
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.ok(await page.getByRole('button', { name: 'Run bots', exact: true }).count());
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.screenshot({ path: 'artifacts/smooth-tablet.png', fullPage: true });
  await page.getByRole('button', { name: 'Save locally', exact: true }).click();
  await page.getByRole('button', { name: 'New story', exact: true }).click();
  // Local save fixture: render both card types without exposing an opponent's hand.
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('mtts-chapters-1'));
    const p = saved.game.players[0];
    for (const kind of ['twist', 'subplot']) {
      const index = saved.game.deck.findIndex(c => c.kind === kind);
      p.hand.push(...saved.game.deck.splice(index, 1));
    }
    localStorage.setItem('mtts-chapters-1', JSON.stringify(saved));
  });
  await page.getByRole('button', {name:'Load local story', exact:true}).click();
  assert.ok(await page.locator('.hand .card-twist').count());
  assert.ok(await page.locator('.hand .card-subplot').count());
  assert.equal(await page.locator('.playerReserve').count(), 2);
  assert.equal(await page.locator('.handCount').count(), 2);
  assert.equal(await page.locator('.libraryReference').getAttribute('open'), null);
  for (const card of await page.locator('.hand .gameCard').all()) {
    const art = await card.locator('.cardArt').boundingBox();
    const text = await card.locator('.cardBody').boundingBox();
    assert.ok(text.y >= art.y + art.height - 1);
  }
  await page.screenshot({path:'artifacts/cards-tablet.png', fullPage:true});
  await page.setViewportSize({width:1500,height:1100});
  await page.screenshot({path:'artifacts/cards-desktop.png', fullPage:true});
  await page.getByRole('button', {name:'New story', exact:true}).click();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('mtts-chapters-1'));
    saved.game.jobs = [{type:'publish',p:0},{type:'finish',p:0}];
    saved.game.active = 0;
    localStorage.setItem('mtts-chapters-1',JSON.stringify(saved));
  });
  await page.getByRole('button',{name:'Load local story',exact:true}).click();
  assert.ok(await page.locator('.publishSite').count());
  await page.screenshot({path:'artifacts/book-placement.png',fullPage:true});
  const beforeBooks = await page.locator('.visualBook').count();
  await page.locator('.publishSite').first().click();
  assert.equal(await page.locator('.visualBook').count(),beforeBooks+1);
  await page.getByRole('button',{name:'New story',exact:true}).click();
  await page.getByLabel('Player 2 controller').selectOption('human');
  await page.getByRole('button', { name: 'Begin story', exact: true }).click();
  await page.getByRole('button', { name: /Pass to Player 1/ }).click();
  await page.locator('.pageDestination').first().click();
  assert.ok(await page.getByRole('button', { name: /Pass to Player 2/ }).count());
  assert.equal(await page.locator('.hand').count(), 0);
  assert.deepEqual(errors, []);
  await writeFile(
    'artifacts/smooth-smoke.json',
    JSON.stringify(
      {
        passed: true,
        errors,
        checks: [
          'automatic human turn',
          'automatic bot setup and turn',
          'direct movement and placement',
          'horizontal tracks',
          'grouped undo pauses bots',
          'hotseat privacy',
          'desktop and tablet',
        ],
      },
      null,
      2,
    ),
  );
  console.log('Smooth turn journeys passed.');
} finally {
  await browser?.close();
  await server.httpServer.close();
}
