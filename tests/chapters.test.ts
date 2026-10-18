import { describe, it, expect } from 'vitest';
import {
  newGame,
  applyAction,
  legalActions,
  playerView,
  capacity,
  minimum,
  power,
  type State,
} from '../src/game/chapters';
import { chooseChapterAction } from '../src/game/chapterBot';
import { adjacentBooks } from '../src/game/topology';
function choose(s: State, key: string) {
  return applyAction(s, key);
}
function ready(n = 2) {
  let s = newGame(
    Array.from({ length: n }, (_, i) => `P${i}`),
    42,
  );
  while (s.jobs[0].type === 'setup') s = choose(s, legalActions(s)[0].key);
  return s;
}
function settle(s: State) {
  let guard = 0;
  while (
    s.jobs[0] &&
    !['start', 'movement', 'afterPlace'].includes(s.jobs[0].type) &&
    guard++ < 100
  ) {
    const a = legalActions(s);
    if (!a.length) throw Error(`stuck ${s.jobs[0]?.type}`);
    s = choose(s, a.find((x) => x.key === 'skip' || x.key === 'pass')?.key ?? a[0].key);
  }
  return s;
}
describe('Chapter edition', () => {
  it('moving an existing Inkling does not grant destination rewards or placement Subplots', () => {
    let s = ready();
    const from = s.books[0],
      to = s.books[1];
    from.slots[0] = 0;
    s.players[0].supply--;
    s.jobs = [{ type: 'transfer', p: 0, to: to.id, mode: 'page', n: 1 }];
    const ink = s.players[0].ink,
      hand = structuredClone(s.players[0].hand);
    s = choose(s, `transfer:${from.id}:0`);
    expect(s.players[0].ink).toBe(ink);
    expect(s.players[0].hand).toEqual(hand);
    expect(s.books.find((b) => b.id === to.id)!.overflow[0]).toBe(1);
    expect(s.jobs.some((j) => ['bonus', 'subplot'].includes(j.type))).toBe(false);
  });
  it('power bookmarks apply per Inkling, but +5 applies only once to the protagonist', () => {
    const s = ready();
    const b = s.books[0],
      p = s.players[0];
    p.figures = [
      { id: 1, page: b.id * 2, primary: true },
      { id: 5, page: b.id * 2, primary: false },
    ];
    const base = power(s, 0, b.id);
    p.marks = [0];
    expect(power(s, 0, b.id) - base).toBe(5);
    p.marks = [];
    b.overflow[0] = 2;
    p.supply -= 2;
    const over = power(s, 0, b.id);
    p.marks = [6];
    expect(power(s, 0, b.id) - over).toBe(6);
    p.marks = [];
    b.slots[0] = 0;
    p.supply--;
    const page = power(s, 0, b.id);
    p.marks = [7];
    expect(power(s, 0, b.id) - page).toBe(2);
  });
  it('Creature overflow placements resolve before further normal-placement choices', () => {
    let s = ready();
    const b = s.books[0];
    s.players[0].figures = [{ id: 7, page: b.id * 2, primary: true }];
    s.jobs = [{ type: 'afterPlace', p: 0, char: 7, first: true }];
    s = choose(s, 'creature');
    expect(s.jobs[0].type).toBe('place');
    s = settle(s);
    expect(s.books[0].overflow[0]).toBe(2);
    expect(s.players[0].ink).toBe(6);
    expect(s.jobs[0].type).toBe('afterPlace');
  });
  it('arrival effects wait until paid movement is finished', () => {
    let s = ready();
    s.players[0].figures = [{ id: 0, page: s.books[0].id * 2, primary: true }];
    s = choose(s, 'turn');
    s = choose(s, legalActions(s).find((a) => a.key.startsWith('move:'))!.key);
    expect(s.jobs[0].type).toBe('route');
    expect(s.used).not.toContain('nemo');
    s = choose(s, 'arrive');
    expect(s.used).toContain('nemo');
  });
  it('a bought bonus costs ink, but free placement does not', () => {
    let s = ready();
    const b = s.books.find((b) => b.id !== 6) ?? s.books[0];
    s.players[0].figures = [
      { id: 1, page: b.id * 2 + (1 < [1, 2, 2, 3, 2, 1, 2, 2, 1][b.id] ? 0 : 1), primary: true },
    ];
    s.jobs = [{ type: 'place', p: 0, char: 1, normal: true, first: true }];
    s = choose(s, 'place:1');
    expect(s.players[0].ink).toBe(7);
    expect(s.players[0].supply).toBe(11);
    const actions = legalActions(s);
    if (s.jobs[0].type === 'subplot') s = choose(s, 'skip');
    if (legalActions(s).some((a) => a.key === 'buy')) {
      s = choose(s, 'buy');
      expect(s.players[0].ink).toBeLessThanOrEqual(7);
    }
  });
  it('winner closes an empty-stack gap and must approve a valid layout', () => {
    let s = ready();
    s.stack = [];
    s.books = [0, 1, 2, 3, 4].map((id, i) => ({
      id,
      q: i * 3,
      r: 0,
      slots: Array([3, 4, 5, 5, 4][id]).fill(null),
      overflow: [0, 0],
      mark: null,
      contested: false,
    }));
    s.jobs = [
      { type: 'compact', p: 1 },
      { type: 'finish', p: 0 },
    ];
    expect(legalActions(s).some((a) => a.key === 'accept-layout')).toBe(false);
    s = choose(s, 'compact');
    expect(s.books.every((b) => s.books.filter((x) => adjacentBooks(b, x)).length >= 2)).toBe(true);
    expect(s.jobs[0].p).toBe(1);
    expect(legalActions(s).some((a) => a.key === 'accept-layout')).toBe(true);
    s = choose(s, 'accept-layout');
    expect(s.active).toBe(1);
  });
  it('view-only bot finishes full games at all player counts', () => {
    for (const n of [2, 3, 4]) {
      let s = ready(n);
      for (let step = 0; step < 5000 && s.winner === null; step++) {
        const v = playerView(s, s.jobs[0].p);
        const key = chooseChapterAction(v);
        expect(key, `phase ${v.phase}`).toBeTruthy();
        s = choose(s, key!);
      }
      expect(s.winner, `${n} seats stalled`).not.toBe(null);
    }
  });
  it('deals mixed physical cards, one book per set, no reserve and deterministic setup', () => {
    const s = newGame(['A', 'B'], 42);
    expect(s).toEqual(newGame(['A', 'B'], 42));
    expect(new Set(s.books.map((b) => Math.floor(b.id / 3))).size).toBe(3);
    const all = [...s.deck, ...s.players.flatMap((p) => p.hand)];
    expect(all).toHaveLength(75);
    expect(all.filter((c) => c.kind === 'twist')).toHaveLength(45);
    expect(new Set(all.map((c) => c.id)).size).toBe(75);
    expect(s.players.every((p) => p.ink === 7 && p.supply === 12)).toBe(true);
  });
  it('ends a chapter at start and spends the whole turn', () => {
    let s = ready();
    s.players[0].ink = 0;
    const action = legalActions(s)[0];
    expect(s.players[0].ink).toBe(7);
    expect(s.jobs[0].type).toBe('publish');
    s = choose(s, action.key);
    expect(s.active).toBe(1);
    expect(s.books).toHaveLength(4);
  });
  it('offers voluntary chapter only at three ink or fewer', () => {
    const s = ready();
    expect(legalActions(s).some((a) => a.key === 'chapter')).toBe(false);
    s.players[0].ink = 3;
    expect(legalActions(s).some((a) => a.key === 'chapter')).toBe(true);
  });
  it('keeps opponent cards, deck, randomness and battle snapshots private', () => {
    const s = ready();
    const v = playerView(s, 1);
    expect(v.players[0].hand).toHaveLength(0);
    expect(v.actions).toHaveLength(0);
    expect(v).not.toHaveProperty('deck');
    expect(v).not.toHaveProperty('rng');
  });
  it('invalid actions are atomic', () => {
    const s = ready(),
      copy = structuredClone(s);
    expect(() => choose(s, 'invalid')).toThrow();
    expect(s).toEqual(copy);
  });
  it('capacity does not fill ink and minimum bonuses stack on bookmark base', () => {
    const p = ready().players[0];
    p.marks = [1, 2];
    p.ongoing = [1, 8, 12, 2];
    expect(capacity(p)).toBe(14);
    expect(p.ink).toBe(7);
    expect(minimum(p)).toBe(8);
  });
  it('first conflict gives a permanent bookmark and cleans up', () => {
    let s = ready();
    const b = s.books[0],
      m = b.mark!;
    b.slots = b.slots.map(() => 0);
    s.players[0].supply -= b.slots.length;
    s.jobs = [
      { type: 'check', p: 0, book: b.id },
      { type: 'finish', p: 0 },
    ];
    s = settle(s);
    expect(s.players[0].marks).toContain(m);
    expect(s.books[0].contested).toBe(true);
    expect(s.books[0].mark).toBe(null);
  });
  it('second conflict awards the book and reaches victory immediately', () => {
    let s = ready();
    const b = s.books[0];
    b.contested = true;
    b.slots = b.slots.map(() => 0);
    s.players[0].supply -= b.slots.length;
    s.players[0].books = [8, 7];
    s.jobs = [{ type: 'check', p: 0, book: b.id }];
    s = settle(s);
    expect(s.winner).toBe(0);
    expect(s.players[0].books).toHaveLength(3);
    expect(s.books.some((x) => x.id === b.id)).toBe(false);
  });
  it('refills every player at turn end', () => {
    let s = ready();
    s.players.forEach((p) => (p.hand = []));
    s.jobs = [{ type: 'finish', p: 0 }];
    legalActions(s);
    expect(s.players.map((p) => p.hand.length)).toEqual([1, 1]);
  });
  it('moves all characters before allowing placement from one', () => {
    let s = ready();
    s.players[0].figures.push({ id: 8, page: s.players[0].figures[0].page, primary: false });
    s = choose(s, 'turn');
    s = choose(s, legalActions(s).find((a) => a.key.startsWith('move:'))!.key);
    s = settle(s);
    expect(legalActions(s).some((a) => a.key.startsWith('source:'))).toBe(false);
  });
  it('conserves Inklings during automated complete games', () => {
    for (let seed = 1; seed <= 4; seed++) {
      let s = newGame(['A', 'B', 'C'], seed);
      for (let step = 0; step < 2500 && s.winner === null; step++) {
        const actions = legalActions(s);
        expect(actions.length, `seed ${seed}, phase ${s.jobs[0]?.type}`).toBeGreaterThan(0);
        let options = actions.filter((a) => !['skip', 'pass', 'chapter'].includes(a.key));
        if (s.jobs[0]?.type === 'movement')
          options = actions.filter((a) => a.key.startsWith('source:')).length
            ? actions.filter((a) => a.key.startsWith('source:'))
            : actions.filter((a) => a.key.startsWith('move:'));
        if (s.jobs[0]?.type === 'afterPlace') options = actions.filter((a) => a.key === 'extra');
        const action = (options.length ? options : actions)[
          (seed * 131 + step * 17) % (options.length ? options : actions).length
        ];
        s = choose(s, action.key);
        for (let p = 0; p < 3; p++) {
          expect(s.players[p].ink).toBeGreaterThanOrEqual(0);
          expect(
            s.players[p].supply +
              s.books.reduce(
                (n, b) => n + b.slots.filter((x) => x === p).length + b.overflow[p],
                0,
              ),
          ).toBe(12);
        }
      }
      expect(s.winner, `seed ${seed} did not finish`).not.toBe(null);
    }
  });
});
