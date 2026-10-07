import { expect, it } from 'vitest';
import { newGame, legalActions, applyAction } from '../src/game/engine';
import { placementFulfills } from '../src/game/subplots';

it('blocks a second owned memory across both pages, including bonus upgrades, but permits another player', () => {
  const s = newGame({ names: ['A', 'B', 'C'], seed: 29 });
  s.books[0].slots[0].memory = { owner: 0, row: 'valor' };
  s.players[0].rows.valor = 1;
  s.books[0].slots[2].owner = 0;
  s.players[0].supply--;
  s.players[0].page = 1;
  s.acted = true;
  s.jobs = [{ type: 'turn', p: 0 }];
  expect(legalActions(s).some((a) => a.key.startsWith('turn:upgrade:0:'))).toBe(false);
  s.jobs = [{ type: 'upgrade', p: 0, book: 0, source: 'bonus' }];
  expect(legalActions(s)).toHaveLength(0);
  const before = structuredClone(s);
  expect(applyAction(s, { key: 'upgrade:0:2:insight' })).not.toBeNull();
  expect(s).toEqual(before);
  s.books[0].slots[2].owner = 1;
  s.jobs = [{ type: 'upgrade', p: 1, book: 0 }];
  expect(legalActions(s).some((a) => a.key === 'upgrade:0:2:insight')).toBe(true);
});

it('Lasting Impression accepts placement beside one owned memory, but not on the other page or an opponent memory', () => {
  const s = newGame({ names: ['A', 'B', 'C'], seed: 29 });
  s.books[0].slots[0].memory = { owner: 0, row: 'valor' };
  expect(placementFulfills(s, 0, 10, { book: 0, slot: 1, triggersConflict: false })).toBe(true);
  expect(placementFulfills(s, 0, 10, { book: 0, slot: 2, triggersConflict: false })).toBe(false);
  expect(placementFulfills(s, 0, 10, { book: 0, slot: null, triggersConflict: false })).toBe(false);
  s.books[0].slots[0].memory!.owner = 1;
  expect(placementFulfills(s, 0, 10, { book: 0, slot: 1, triggersConflict: false })).toBe(false);
});
