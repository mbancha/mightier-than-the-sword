import { describe, it, expect } from 'vitest';
import { newGame, applyAction, legalActions, fullBooks } from '../src/game/engine';
import { books, subplots, twists } from '../src/data/catalog';
const act = (s: ReturnType<typeof newGame>, key: string) =>
  expect(applyAction(s, { key }), key).toBeNull();
function fresh() {
  const s = newGame({ names: ['A', 'B', 'C'], seed: 29 });
  const old = s.books[0].id,
    index = s.books.findIndex((b) => b.id === 2);
  if (index >= 0) s.books[index].id = old;
  else s.unpublished[s.unpublished.indexOf(2)] = old;
  s.books[0].id = 2;
  s.books.forEach(
    (b) =>
      (b.slots = books[b.id].page_slots.flatMap((n, page) =>
        Array.from({ length: n }, () => ({ page, owner: null, memory: null })),
      )),
  );
  s.players.forEach((p) => {
    p.subplotTurn = s.turn;
    p.page = 2;
  });
  return s;
}
function conflict() {
  const s = fresh();
  s.players[0].page = 0;
  s.books[0].slots.forEach((x, i) => {
    x.owner = i < 3 ? 1 : 0;
    s.players[x.owner].supply--;
  });
  s.jobs = [{ type: 'forcedConflict', p: 0 }];
  act(s, 'forcedConflict:0');
  while (s.jobs[0].type === 'battle') act(s, 'pass');
  return s;
}
describe('Rules-overhaul integration 0.7', () => {
  it('preserves the pre-cleanup ranking for first and second scoring', () => {
    const s = conflict();
    expect(s.battle!.ranking).toEqual([1, 0]);
    expect(s.books[0].slots.every((x) => x.owner === null)).toBe(true);
    act(s, `token:${s.pools[0][0]}`);
    expect(s.players.map((p) => p.points)).toEqual([2, 5, 0]);
    expect(s.jobs[0].type).toBe('publish');
  });
  it('reuses a flipped token without publication or ending the Act', () => {
    const s = conflict();
    const id = s.pools[0][0];
    s.tokenStrong[id] = false;
    act(s, `token:${id}`);
    expect(s.players.map((p) => p.points)).toEqual([2, 3, 0]);
    expect(s.act).toBe(1);
    expect(s.books).toHaveLength(3);
    expect(s.pools[0]).toContain(id);
  });
  it('breaks power ties by leftmost page Inkling', () => {
    const s = fresh();
    s.books[0].slots[0].owner = 1;
    s.players[1].supply--;
    s.books[0].slots[1].owner = 0;
    s.players[0].supply--;
    s.jobs = [{ type: 'forcedConflict', p: 0 }];
    act(s, 'forcedConflict:0');
    act(s, 'pass');
    act(s, 'pass');
    expect(s.battle!.ranking).toEqual([1, 0]);
  });
  it('makes the two-player neutral Inkling visible to fullness and unavailable for placement', () => {
    const s = newGame({ names: ['A', 'B'], seed: 29 });
    expect(s.books[0].slots[0].neutral).toBe(true);
    s.players[0].page = 0;
    s.jobs = [{ type: 'turn', p: 0 }];
    expect(legalActions(s).some((a) => a.key === 'placeHere:0')).toBe(false);
    s.books[0].slots.slice(1).forEach((x) => (x.owner = 0));
    expect(fullBooks(s)).toContain(0);
  });
  it('requires placement before optional memory and exposes Resolve tiers', () => {
    const s = fresh();
    s.players[0].page = 0;
    s.books[0].slots[0].owner = 0;
    s.players[0].supply--;
    s.jobs = [{ type: 'turn', p: 0 }];
    expect(legalActions(s).some((a) => a.key.startsWith('turn:upgrade:'))).toBe(false);
    act(s, 'placeHere:1');
    expect(legalActions(s).some((a) => a.key === 'turn:upgrade:0:1:valor')).toBe(true);
  });
  it('ends a no-supply turn safely if no owned book Inkling remains', () => {
    const s = fresh();
    s.players[0].reserves[1] += s.players[0].supply;
    s.players[0].supply = 0;
    s.jobs = [{ type: 'forcedConflict', p: 0 }];
    act(s, 'forcedConflict:none');
    expect(s.active).toBe(1);
  });
  it('draws Twists at each Insight level without discarding to a hand limit', () => {
    for (const level of [0, 1, 2, 3]) {
      const s = fresh();
      s.players[0].rows.insight = level;
      for (let i = 0; i < level; i++) s.books[1].slots[i].memory = { owner: 0, row: 'insight' };
      const before = s.players[0].hand.length;
      s.jobs = [
        { type: 'move', p: 0, n: 1, source: 'book' },
        { type: 'end', p: 0 },
      ];
      act(s, 'endMove');
      expect(s.players[0].hand.length).toBe(before + level + 1);
      expect(s.active).toBe(1);
    }
  });
  it('advances an exhausted Act when all remaining Inklings are suspended', () => {
    const s = fresh();
    s.players.forEach((p) => {
      p.reserves[1] += p.supply;
      p.supply = 0;
    });
    s.jobs = [
      { type: 'move', p: 0, n: 1, source: 'book' },
      { type: 'start', p: 0 },
    ];
    act(s, 'endMove');
    expect(s.act).toBe(2);
    expect(s.players.every((p) => p.supply === 9)).toBe(true);
  });
  it('adds kept-card points once at the final Act', () => {
    const s = fresh();
    const id = s.players[0].hand.pop()!;
    s.players[0].keptTwists.push(id);
    s.players[0].completedSubplots.push(0);
    s.players[0].subplot = null;
    s.act = 3;
    s.jobs = [
      { type: 'move', p: 0, n: 1, source: 'book' },
      { type: 'advanceAct', p: 0 },
    ];
    act(s, 'endMove');
    expect(s.over).toBe(true);
    expect(s.players[0].points).toBe(twists[id].endPoints + subplots[0].endPoints);
  });
});
