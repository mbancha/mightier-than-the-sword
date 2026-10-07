import { describe, it, expect } from 'vitest';
import { newGame, applyAction, legalActions, power } from '../src/game/engine';
import { playerView } from '../src/game/views';
import { pageNeighbors } from '../src/game/topology';
import type { GameState } from '../src/game/types';
function fresh() {
  const s = newGame({ names: ['A', 'B'], seed: 20 });
  s.books.forEach((b) => b.slots.forEach((x) => (x.neutral = false)));
  s.players[0].page = 0;
  // Prevent unrelated objective completion while testing the track jobs.
  s.players.forEach((p) => (p.subplotTurn = s.turn));
  s.jobs = [{ type: 'turn', p: 0 }];
  return s;
}
const act = (s: GameState, key: string) => {
  for (const row of ['curiosity', 'valor', 'insight', 'resolve'] as const) {
    const have = s.books
      .flatMap((b) => b.slots)
      .filter((x) => x.memory?.owner === 0 && x.memory.row === row).length;
    for (let i = have; i < s.players[0].rows[row]; i++) {
      const slot = s.books
        .slice(1)
        .flatMap((b) => b.slots)
        .find((x) => !x.memory)!;
      slot.memory = { owner: 0, row };
    }
  }
  expect(applyAction(s, { key }), key).toBeNull();
};
describe('Quill tracks 0.6', () => {
  it('offers only available Resolve alternatives and retires the discard boost', () => {
    for (let level = 0; level <= 3; level++) {
      const s = fresh();
      s.players[0].rows.resolve = level;
      expect(legalActions(s).some((a) => a.key.startsWith('boost:'))).toBe(false);
      act(s, 'place');
      expect(legalActions(s).map((a) => a.key)).toEqual(
        Array.from({ length: level + 1 }, (_, i) => `resolveOption:${i}`),
      );
      if (level < 3) expect(applyAction(s, { key: 'resolveOption:3' })).not.toBeNull();
    }
  });
  it('overflow-only tier bypasses empty numbered spaces', () => {
    const s = fresh();
    s.players[0].rows.resolve = 1;
    const before = s.players[0].supply;
    act(s, 'place');
    act(s, 'resolveOption:1');
    expect(
      legalActions(s)
        .filter((a) => a.key.startsWith('place:'))
        .map((a) => a.key),
    ).toEqual(['place:null']);
    act(s, 'place:null');
    act(s, 'place:null');
    expect(s.players[0].supply).toBe(before - 2);
    // Submarine may suspend incoming overflow instead of storing it.
    expect(s.books[0].slots.every((x) => x.owner === null)).toBe(true);
  });
  it('mixed tier places normally then in overflow', () => {
    const s = fresh();
    s.players[0].rows.resolve = 2;
    act(s, 'place');
    act(s, 'resolveOption:2');
    const normal = legalActions(s).find(
      (a) => a.key.startsWith('place:') && !a.key.endsWith('null'),
    )!;
    act(s, normal.key);
    // Ignore a placement-triggered optional book move before continuing.
    if (s.jobs[0].type === 'bookMove') act(s, 'skip');
    expect(legalActions(s).some((a) => a.key === 'place:null')).toBe(true);
    act(s, 'place:null');
    expect(s.books[0].slots.some((x) => x.owner === 0)).toBe(true);
  });
  it('final tier is restricted to the origin and directly adjacent pages, and can stop early', () => {
    const s = fresh();
    s.players[0].rows.resolve = 3;
    act(s, 'place');
    act(s, 'resolveOption:3');
    const allowed = new Set([0, ...pageNeighbors(s.books, 0)]);
    expect(
      legalActions(s)
        .filter((a) => a.key.startsWith('adjacent:'))
        .every((a) => allowed.has(a.page!)),
    ).toBe(true);
    const a = legalActions(s).find((a) => a.key.startsWith('adjacent:'))!;
    act(s, a.key);
    if (s.jobs[0].type === 'bookMove') act(s, 'skip');
    act(s, 'skip');
    expect(s.players[0].supply).toBe(5);
  });
  it('final Curiosity starts at 5 and consumes one move per step', () => {
    const s = fresh();
    s.players[0].rows.curiosity = 3;
    s.jobs = [{ type: 'move', p: 0, source: 'normal', origin: 0 }];
    expect(playerView(s, 0).moving?.remaining).toBe(5);
    act(s, `step:${pageNeighbors(s.books, 0)[0]}`);
    expect(playerView(s, 0).moving?.remaining).toBe(4);
  });
  it('final Valor adds 2 plus owned numbered and overflow Inklings only when the Quill is here', () => {
    const s = fresh();
    s.books[0].id = 8;
    s.players[0].rows.valor = 3;
    s.books[0].slots[0].owner = 0;
    s.books[0].overflow[0] = 2;
    expect(power(s, 0, 0)).toBe(8); // 3 Inkling power + Quill 2+3
    s.players[0].page = 2;
    expect(power(s, 0, 0)).toBe(3);
  });
});

// Final-Act and shoot-the-moon paths also count as end of turn.
describe('Insight at Act boundaries', () => {
  it('interrupts adjacent placements with an immediate conflict', () => {
    const s = fresh();
    s.players[0].rows.resolve = 3;
    s.books[0].slots.forEach((x, i) => {
      if (i) {
        x.owner = 0;
        s.players[0].supply--;
      }
    });
    s.jobs = [
      { type: 'placeAdjacent', p: 0, page: 0, n: 3, optional: true },
      { type: 'turn', p: 0 },
    ];
    act(s, 'adjacent:0:place:0');
    if (s.jobs[0].type === 'bookMove') act(s, 'skip');
    expect(s.battle?.book).toBe(0);
    expect(s.jobs.some((j) => j.type === 'placeAdjacent' && j.n === 2)).toBe(true);
  });
});
