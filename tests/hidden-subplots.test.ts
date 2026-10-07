import { describe, expect, it } from 'vitest';
import { applyAction, newGame, legalActions } from '../src/game/engine';
import { placementFulfills } from '../src/game/subplots';
import { playerView, publicView } from '../src/game/views';
import { subplots } from '../src/data/catalog';
const fresh = () => {
  const s = newGame({ names: ['A', 'B', 'C'], seed: 29 });
  s.books.forEach((b) => {
    b.slots = [0, 0, 1, 1].map((page) => ({ page, owner: null, memory: null }));
  });
  s.players[0].page = 0;
  return s;
};
const ownMemory = { owner: 0, row: 'valor' as const };
const otherMemory = { owner: 1, row: 'insight' as const };
describe('15 placement-triggered Subplots', () => {
  it.each(Array.from({ length: 15 }, (_, i) => i))(
    'checks card %i at its qualifying placement',
    (id) => {
      const s = fresh();
      const b = s.books[0];
      let slot: number | null = 0;
      switch (id) {
        case 0:
          s.books[1].slots[0].owner = 0;
          break;
        case 1:
          slot = 1;
          s.books[1].slots[1].owner = 0;
          break;
        case 2:
          slot = 3;
          b.slots[0].owner = 0;
          break;
        case 3:
          s.books[1].overflow[0] = 1;
          s.books[2].slots[0].owner = 0;
          break;
        case 4:
          slot = null;
          b.slots[0].owner = 0;
          b.overflow[0] = 2;
          break;
        case 5:
          slot = 2;
          b.slots[0].owner = 0;
          b.overflow[0] = 1;
          break;
        case 6:
          slot = null;
          b.overflow[0] = 1;
          s.books[1].overflow[0] = 1;
          break;
        case 7:
          b.slots[0].memory = otherMemory;
          b.slots[1].owner = 0;
          break;
        case 8:
          b.slots[0].memory = otherMemory;
          b.slots[2].memory = ownMemory;
          break;
        case 9:
          b.slots[0].memory = otherMemory;
          s.books[1].slots[0].owner = 0;
          s.books[1].slots[0].memory = otherMemory;
          break;
        case 10:
          b.slots[0].memory = ownMemory;
          break;
        case 11:
          b.slots[2].memory = ownMemory;
          break;
        case 12:
          b.slots[1].owner = 0;
          b.overflow[0] = 1;
          break;
        case 13:
          b.slots[0].memory = otherMemory;
          break;
        case 14:
          s.books[1].overflow[0] = 1;
          s.books[2].overflow[0] = 1;
          break;
      }
      if (slot !== null) b.slots[slot].owner = 0;
      const e = { book: 0, slot, triggersConflict: id >= 11 };
      expect(placementFulfills(s, 0, id, e)).toBe(true);
      expect(placementFulfills(fresh(), 0, id, { book: 0, slot: 0, triggersConflict: false })).toBe(
        false,
      );
      if (id >= 11)
        expect(placementFulfills(s, 0, id, { ...e, triggersConflict: false })).toBe(false);
    },
  );
  it('requires book adjacency for first/last/binding goals', () => {
    const s = fresh();
    s.books[0].slots[0].owner = 0;
    s.books[1].slots[0].owner = 0;
    expect(placementFulfills(s, 0, 0, { book: 0, slot: 0, triggersConflict: false })).toBe(true);
    s.books[1].q = 9;
    expect(placementFulfills(s, 0, 0, { book: 0, slot: 0, triggersConflict: false })).toBe(false);
  });
  it('does not count binding spaces as either page', () => {
    const s = fresh();
    s.books[0].slots[0].owner = 0;
    s.books[0].overflow[0] = 3;
    expect(placementFulfills(s, 0, 5, { book: 0, slot: null, triggersConflict: false })).toBe(
      false,
    );
  });
  it('completes at placement before memory effects, keeps the card, and blocks replacement chains', () => {
    const s = newGame({ names: ['A', 'B', 'C'], seed: 29 });
    s.players[0].subplot = 3;
    s.players[1].subplot = null;
    s.players[2].subplot = null;
    s.books[1].overflow[0] = 1;
    s.books[2].overflow[0] = 1;
    s.players[0].supply -= 2;
    s.players[0].page = 0;
    s.jobs = [
      { type: 'place', p: 0, page: 0, n: 1 },
      { type: 'turn', p: 0 },
    ];
    expect(applyAction(s, { key: 'place:0' })).toBeNull();
    expect(s.jobs[0].type).toBe('subplot');
    expect(applyAction(s, { key: 'alternative' })).toBeNull();
    expect(s.players[0].completedSubplots).toContain(3);
    expect(s.players[0].subplotTurn).toBe(s.turn);
    s.players[0].subplot = 3;
    s.jobs = [
      { type: 'place', p: 0, page: 0, n: 1 },
      { type: 'turn', p: 0 },
    ];
    expect(applyAction(s, { key: 'place:1' })).toBeNull();
    expect(s.jobs[0].type).not.toBe('subplot');
  });
  it('drawing, Quill movement and forced conflict do not complete established arrangements', () => {
    const s = newGame({ names: ['A', 'B', 'C'], seed: 29 });
    s.players[0].subplot = 3;
    s.books.forEach((b) => (b.overflow[0] = 1));
    s.players[0].supply -= 3;
    s.jobs = [
      { type: 'move', p: 0, n: 1, source: 'book' },
      { type: 'turn', p: 0 },
    ];
    expect(applyAction(s, { key: 'endMove' })).toBeNull();
    expect(s.jobs[0].type).toBe('turn');
    s.jobs = [{ type: 'forcedConflict', p: 0 }];
    expect(applyAction(s, { key: 'forcedConflict:0' })).toBeNull();
    expect(s.jobs[0].type).not.toBe('subplot');
  });
  it('does not reveal an opponent objective through any projection', () => {
    const s = fresh(),
      t = structuredClone(s);
    t.players[1].subplot = (s.players[1].subplot! + 1) % 15;
    expect(publicView(s)).toEqual(publicView(t));
    expect(playerView(s, 0)).toEqual(playerView(t, 0));
    expect(playerView(s, 1).players[0].subplot).toBeNull();
  });
  it('has fifteen concise placement cards using the new terms', () => {
    expect(subplots).toHaveLength(15);
    for (const c of subplots) {
      expect(c.text.startsWith('Place an Inkling')).toBe(true);
      expect(c.text).not.toMatch(/numbered|overflow/i);
    }
  });
});
