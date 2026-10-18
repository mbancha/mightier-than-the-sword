import { it, expect } from 'vitest';
import { newGame, applyAction, legalActions, actingPlayer } from '../src/game/chapters';
import { settleFlow, flowChoices, applyFlow } from '../src/game/chapterFlow';
import {playerView} from '../src/game/chapters';
import {chooseChapterAction} from '../src/game/chapterBot';
it('finishes a mixed human-flow and automatic-bot game without administrative clicks',()=>{let s=settleFlow(newGame(['Human','Bot'],17,[false,true]));for(let i=0;i<4000&&s.winner===null;i++){const actor=actingPlayer(s);if(s.players[actor].bot){const key=chooseChapterAction(playerView(s,actor));expect(key).toBeTruthy();s=settleFlow(applyAction(s,key!))}else{const a=flowChoices(s);expect(a.length,`phase ${s.jobs[0]?.type}`).toBeGreaterThan(0);const preferred=a.find(x=>x.key==='accept-layout')??a.find(x=>x.key==='extra')??a.find(x=>x.key.startsWith('place:'))??a.find(x=>x.key.startsWith('move:'))??a.find(x=>x.key.startsWith('card:'))??a.find(x=>x.key==='end')??a[0];s=applyFlow(s,preferred.key)}}expect(s.winner).not.toBe(null)});
it('choosing a placement can select its character after both have moved', () => {
  let s = ready();
  const p = s.players[0];
  p.figures = [
    { id: 1, page: s.books[0].id * 2, primary: true },
    { id: 8, page: s.books[1].id * 2, primary: false },
  ];
  s.moving = [1, 8];
  const choices = flowChoices(s).filter((a) => a.key.includes('@'));
  expect(new Set(choices.map((a) => a.page)).size).toBe(2);
  const chosen = choices.find((a) => a.page === p.figures[1].page)!;
  s = applyFlow(s, chosen.key);
  expect(s.source).toBe(8);
  expect(s.players[0].supply).toBe(11);
});
function ready() {
  let s = newGame(['A', 'B'], 42, [false, true]);
  while (s.jobs[0].type === 'setup') s = applyAction(s, legalActions(s)[0].key);
  return settleFlow(s);
}
it('begins the human turn without a start button', () => {
  const s = ready();
  expect(s.jobs[0].type).toBe('movement');
  expect(flowChoices(s).some((a) => a.key === 'turn')).toBe(false);
});
it('movement can flow into placement with no finish-movement or source click', () => {
  let s = ready();
  s.players[0].figures[0].id = 1;
  s.players[0].hand = [];
  s = applyFlow(s, flowChoices(s).find((a) => a.key.startsWith('move:'))!.key);
  expect(s.jobs[0].type).toBe('route');
  const choices = flowChoices(s);
  expect(choices.some((a) => a.key === 'arrive')).toBe(false);
  const c = choices.find((a) => a.key.startsWith('place:'))!;
  expect(c).toBeTruthy();
  const before = s.players[0].supply;
  s = applyFlow(s, c.key);
  expect(s.players[0].supply).toBe(before - 1);
});
it('preserves voluntary chapter ending alongside movement at low ink', () => {
  let s = ready();
  s.players[0].ink = 3;
  s.jobs = [{ type: 'start', p: 0 }];
  s = settleFlow(s);
  const a = flowChoices(s);
  expect(a.some((x) => x.key === 'chapter')).toBe(true);
  expect(a.some((x) => x.key.startsWith('move:'))).toBe(true);
});
it('never auto-buys or declines an optional bonus', () => {
  let s = ready();
  s.jobs = [{ type: 'bonus', p: 0, book: s.books[0].id, k: 1 }];
  const before = structuredClone(s);
  const next = settleFlow(s);
  expect(next.players[0].ink).toBe(before.players[0].ink);
  expect(next.jobs[0].type).toBe('bonus');
});
it('ends a turn automatically only if no optional placement remains', () => {
  let s = ready();
  s.players[0].ink = 0;
  s.jobs = [{ type: 'afterPlace', p: 0, char: s.players[0].figures[0].id, first: false }];
  s = settleFlow(s);
  expect(actingPlayer(s)).toBe(1);
});
it('leaves all bot decisions for the automatic bot runner', () => {
  let s = ready();
  s.active = 1;
  s.jobs = [{ type: 'start', p: 1 }];
  const next = settleFlow(s);
  expect(next.jobs[0].type).toBe('start');
});
