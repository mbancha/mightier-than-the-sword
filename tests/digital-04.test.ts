import { describe, it, expect } from 'vitest';
import { newGame, applyAction, legalActions, power, assertInvariants } from '../src/game/engine';
import { books, characters } from '../src/data/catalog';
import type { GameState, Job } from '../src/game/types';
function fresh(id: number, seed = 20) {
  const s = newGame({ names: ['A', 'B'], seed });
  const i = s.books.findIndex((b) => b.id === id);
  if (i >= 0) [s.books[0].id, s.books[i].id] = [s.books[i].id, s.books[0].id];
  else {
    s.unpublished[s.unpublished.indexOf(id)] = s.books[0].id;
    s.books[0].id = id;
  }
  for (const b of s.books)
    b.slots = books[b.id].page_slots.flatMap((n, page) =>
      Array.from({ length: n }, () => ({ page, owner: null, memory: null })),
    );
  s.jobs = [{ type: 'turn', p: 0 }];
  return s;
}
function act(s: GameState, key: string) {
  expect(applyAction(s, { key }), key).toBeNull();
}
function put(s: GameState, k: number, p = 0) {
  s.books[0].slots[k].owner = p;
  s.players[p].supply--;
}
function give(s: GameState, id: number, p = 0) {
  s.decks.character = s.decks.character.filter((x) => x !== id);
  s.characters.push({
    id,
    owner: p,
    page: 0,
    other: null,
    collected: 0,
    used: characters[id].actions.map(() => 0),
  });
}
function trigger(s: GameState, j: Job) {
  s.jobs = [{ type: 'move', p: 0, n: 1, source: 'book' }, j, { type: 'turn', p: 0 }];
  act(s, 'endMove');
}
describe('Digital 0.4 rules', () => {
  it('starts with six supply, two three-Inkling reserves, one Twist and one Subplot', () => {
    for (const n of [2, 3, 4]) {
      const s = newGame({ names: ['A', 'B', 'C', 'D'].slice(0, n), seed: 1 });
      for (const p of s.players) {
        expect(p.supply).toBe(6);
        expect(p.reserves).toEqual([0, 3, 3]);
        expect(p.hand).toHaveLength(1);
        expect(p.subplot).not.toBeNull();
      }
      assertInvariants(s);
    }
    expect(books.map((b) => b.title)).toContain('The Aeneid');
    expect(books.map((b) => b.title)).not.toContain('Beowulf');
    expect(characters[5].actions[0][0]).toBe(2);
    expect(characters[6].actions[0][0]).toBe(2);
  });
  it('middle spaces have no automatic reward', () => {
    const s = fresh(2),
      before = [...s.players[0].hand];
    act(s, 'placeHere:1');
    expect(s.players[0].hand).toEqual(before);
  });

  it('Dracula offers only the castle owner one erasure, including any own Inkling', () => {
    const s = fresh(6);
    [1, 0, 0, 1].forEach((p, k) => put(s, k, p));
    s.jobs = [{ type: 'resolve', p: 0 }];
    act(s, 'conflict:0');
    expect(s.jobs[0]).toMatchObject({ type: 'erase', p: 1, source: 'castle' });
    expect(legalActions(s).filter((a) => a.key.startsWith('target:'))).toHaveLength(4);
    act(s, 'target:0:0:1');
    expect(s.books[0].slots[0].owner).toBeNull();
    expect(s.battle?.bonus).toEqual([0, 0]);
    expect(s.battle?.cursor).toBe(1);
  });
  it('Frankenstein erases old overflow but preserves slot Inklings in overflow, with memories left behind', () => {
    const s = fresh(7);
    put(s, 0);
    put(s, 1, 1);
    s.players[0].supply--;
    s.books[0].overflow[0] = 1;
    s.books[0].slots[0].memory = { owner: 0, row: 'valor' };
    s.players[0].rows.valor = 1;
    trigger(s, { type: 'cleanup', p: 0, book: 0 });
    expect(s.books[0].overflow).toEqual([1, 1]);
    expect(s.books[0].slots.every((x) => x.owner === null)).toBe(true);
    expect(s.players.map((p) => p.supply)).toEqual([5, 5]);
    expect(s.books[0].slots[0].memory).not.toBeNull();
  });
  it('Jekyll flips on every placement, permits negative points and replays deterministically', () => {
    const outcomes = new Set<number>();
    for (let seed = 1; seed <= 15; seed++) {
      const s = fresh(8, seed),
        t = structuredClone(s);
      act(s, 'placeHere:0');
      act(t, 'placeHere:0');
      expect(s).toEqual(t);
      outcomes.add(s.players[0].points);
    }
    expect([...outcomes].sort()).toEqual([-1, 1]);
  });
  it('Iliad adds one power for each character and Quill, without the old solo Twist bonus', () => {
    const s = fresh(4);
    give(s, 3);
    give(s, 6);
    put(s, 0);
    expect(power(s, 0, 0)).toBe(9); // Inkling 1, Achilles 3+1, Odysseus 2+1, Quill 0+1
  });
  it('Odyssey rewards its departing figure owner on ability and step moves, not internal moves', () => {
    const s = fresh(3);
    give(s, 6);
    s.jobs = [
      { type: 'move', p: 0, n: 3, source: 'book' },
      { type: 'turn', p: 0 },
    ];
    act(s, 'step:1');
    expect(s.players[0].points).toBe(0);
    act(s, 'step:2');
    expect(s.players[0].points).toBe(1);
    act(s, 'endMove');
    s.jobs = [
      { type: 'move', p: 0, char: 6, n: 3, source: 'character' },
      { type: 'turn', p: 0 },
    ];
    act(s, 'page:2');
    expect(s.players[0].points).toBe(2);
  });
  it('Aeneid suspends numbered and overflow Inklings, without triggering Frankenstein collection', () => {
    for (const actNumber of [1, 3]) {
      const s = fresh(5);
      s.act = actNumber;
      give(s, 1);
      put(s, 0);
      s.players[0].supply--;
      s.books[0].overflow[0] = 1;
      trigger(s, { type: 'cleanup', p: 0, book: 0 });
      expect(s.jobs[0].type).toBe('turn');
      expect(s.players[0].supply).toBe(4);
      expect(actNumber === 1 ? s.players[0].reserves[1] : s.players[0].out).toBe(
        actNumber === 1 ? 5 : 2,
      );
    }
  });
  it('World placement offers Quill or any owned character a one-page move', () => {
    const s = fresh(1);
    give(s, 3);
    s.characters[0].page = 2;
    act(s, 'placeHere:0');
    expect(legalActions(s).map((a) => a.key)).toEqual(['bookMove:Quill', 'bookMove:3', 'skip']);
    act(s, 'bookMove:3');
    act(s, 'page:3');
    expect(s.characters[0].page).toBe(3);
  });
  it('the submarine redirects Nemo transfers without treating them as new placements', () => {
    const s = fresh(0);
    give(s, 7);
    s.characters[0].used[0] = 2;
    s.players[0].supply -= 2;
    s.jobs = [
      { type: 'nemo', p: 0, book: 0 },
      { type: 'turn', p: 0 },
    ];
    act(s, 'nemo:2');
    act(s, legalActions(s).find((a) => a.key.startsWith('bindingRedirect:'))!.key);
    expect(s.players[0].reserves[1]).toBe(3);
    expect(s.books.slice(1).reduce((n, b) => n + b.overflow[0], 0)).toBe(2);
    expect(s.books[0].overflow[0]).toBe(0);
    expect(s.characters[0].used[0]).toBe(0);
  });
  it('Journey adds one power per overflow Inkling rather than a flat bonus', () => {
    const s = fresh(2);
    s.players[0].supply -= 3;
    s.books[0].overflow[0] = 3;
    expect(power(s, 0, 0)).toBe(6);
    assertInvariants(s);
  });
});
