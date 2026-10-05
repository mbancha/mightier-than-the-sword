import { describe, it, expect } from 'vitest';
import {
  newGame,
  applyAction,
  legalActions,
  fullBooks,
  assertInvariants,
} from '../src/game/engine';
import { books, characters, twists } from '../src/data/catalog';
import type { GameState } from '../src/game/types';
function fresh(id = 2) {
  const s = newGame({ names: ['A', 'B'], seed: 20 });
  const i = s.books.findIndex((b) => b.id === id);
  if (i >= 0) [s.books[0].id, s.books[i].id] = [s.books[i].id, s.books[0].id];
  else {
    s.unpublished[s.unpublished.indexOf(id)] = s.books[0].id;
    s.books[0].id = id;
  }
  s.books.forEach(
    (b) =>
      (b.slots = books[b.id].page_slots.flatMap((n, page) =>
        Array.from({ length: n }, () => ({ page, owner: null, memory: null })),
      )),
  );
  s.players.forEach((p) => (p.subplot = null));
  s.jobs = [{ type: 'turn', p: 0 }];
  return s;
}
const act = (s: GameState, key: string) => expect(applyAction(s, { key }), key).toBeNull();
function put(s: GameState, k: number, p: number) {
  s.books[0].slots[k].owner = p;
  s.players[p].supply--;
}
function hand(s: GameState, p: number, id: number) {
  s.decks.twist = s.decks.twist.filter((x) => x !== id);
  s.discards.twist = s.discards.twist.filter((x) => x !== id);
  s.players.forEach((p) => (p.hand = p.hand.filter((x) => x !== id)));
  s.players[p].hand.push(id);
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
function start(owners = [1, 0, 1, 0]) {
  const s = fresh();
  owners.forEach((p, k) => put(s, k, p));
  s.players[0].page = 1;
  act(s, 'placeHere:4');
  return s;
}
describe('Mandatory Quill movement', () => {
  it('cannot stay, stop before moving, or finish a loop at the starting page', () => {
    const s = fresh();
    s.jobs = [
      { type: 'move', p: 0, n: 3, source: 'normal', origin: 0 },
      { type: 'turn', p: 0 },
    ];
    expect(legalActions(s).map((a) => a.key)).not.toContain('endMove');
    expect(legalActions(s).map((a) => a.key)).not.toContain('page:0');
    act(s, 'step:1');
    act(s, 'step:0');
    expect(legalActions(s).map((a) => a.key)).not.toContain('endMove');
    expect(legalActions(s).map((a) => a.key)).not.toContain('page:0');
    act(s, 'step:1');
    act(s, 'endMove');
    expect(s.players[0].page).toBe(1);
  });
  it('blocks a last step back to the origin without spending movement', () => {
    const s = fresh();
    s.jobs = [
      { type: 'move', p: 0, n: 2, source: 'normal', origin: 0 },
      { type: 'turn', p: 0 },
    ];
    act(s, 'step:1');
    const old = structuredClone(s);
    expect(applyAction(s, { key: 'step:0' })).not.toBeNull();
    expect(s).toEqual(old);
  });
  it('keeps optional character movement optional', () => {
    const s = fresh();
    give(s, 3);
    s.jobs = [
      { type: 'move', p: 0, n: 1, char: 3, source: 'character' },
      { type: 'turn', p: 0 },
    ];
    act(s, 'endMove');
    expect(s.characters[0].page).toBe(0);
  });
});
describe('Direct spaces and memory rewards', () => {
  it('places directly as the turn action; first and last spaces do not draw', () => {
    for (const k of [0, 4]) {
      const s = fresh();
      s.players[0].page = s.books[0].slots[k].page;
      const n = s.players[0].hand.length;
      act(s, `placeHere:${k}`);
      expect(s.acted).toBe(true);
      expect(s.books[0].slots[k].owner).toBe(0);
      expect(s.players[0].hand).toHaveLength(n);
    }
  });
  it('draws only the Insight memory reward on middle spaces, with no inherent Twist reward', () => {
    for (const k of [1, 2, 3]) {
      const s = fresh();
      s.players[0].rows.insight = 1;
      s.books[0].slots[k].memory = { owner: 0, row: 'insight' };
      s.jobs = [
        { type: 'place', p: 0, page: s.books[0].slots[k].page, n: 1 },
        { type: 'turn', p: 0 },
      ];
      const n = s.players[0].hand.length;
      act(s, `place:${k}`);
      expect(s.players[0].hand).toHaveLength(n + 1);
    }
  });
  it('upgrades directly without needing a supply Inkling and leaves the space empty', () => {
    const s = fresh();
    for (let k = 0; k < 4; k++) put(s, k, 0);
    act(s, 'memoryHere:0:0:valor');
    expect(s.books[0].slots[0].owner).toBeNull();
    expect(s.books[0].slots[0].memory?.row).toBe('valor');
    expect(s.players[0].reserves[1]).toBe(4);
    expect(s.acted).toBe(true);
  });
  it('does not count a memory alone as filling a space', () => {
    const s = fresh(5);
    put(s, 0, 0);
    put(s, 2, 1);
    s.books[0].slots[1].memory = { owner: 0, row: 'valor' };
    s.players[0].rows.valor = 1;
    expect(fullBooks(s)).toEqual([]);
  });
  it('has no legal Twist plays outside conflict', () => {
    const s = fresh();
    for (const t of twists) hand(s, 0, t.id);
    expect(legalActions(s).some((a) => a.key.startsWith('twist:'))).toBe(false);
    expect(twists.every((t) => t.timing === 'CONFLICT')).toBe(true);
  });
});
describe('Immediate left-to-right conflicts', () => {
  it('starts on the final placement, before the remaining placement or end-turn action', () => {
    const s = fresh();
    [1, 0, 1, 0].forEach((p, k) => put(s, k, p));
    s.players[0].page = 1;
    s.acted = true;
    s.jobs = [
      { type: 'place', p: 0, page: 1, n: 2 },
      { type: 'turn', p: 0 },
    ];
    act(s, 'place:4');
    expect(s.battle?.book).toBe(0);
    expect(s.jobs[0].type).toBe('battle');
    expect(s.jobs.some((j) => j.type === 'place' && j.n === 1)).toBe(true);
  });
  it('checks every occupied space once in order, including repeated owners', () => {
    const s = start();
    const order = [];
    while (s.jobs[0].type === 'battle') {
      order.push([s.battle!.cursor, s.jobs[0].p]);
      act(s, 'pass');
    }
    expect(order).toEqual([
      [0, 1],
      [1, 0],
      [2, 1],
      [3, 0],
      [4, 0],
    ]);
    expect(s.jobs[0].type).toBe('takeToken');
  });
  it('allows the same player to play at multiple spaces, holding cards out of reshuffles', () => {
    const s = start([0, 1, 0, 1]);
    hand(s, 0, 0);
    hand(s, 0, 1);
    act(s, 'twist:0');
    expect(s.battle!.cursor).toBe(1);
    expect(s.battle!.cards).toContain(0);
    act(s, 'pass');
    act(s, 'twist:1');
    expect(s.battle!.played[0]).toBe(2);
    expect(s.battle!.cards).toContain(1);
  });
  it('uses a changed future occupant after Stolen Vitality without a middle-space draw', () => {
    const s = start([0, 1, 0, 1]);
    hand(s, 0, 13);
    const n = s.players[0].hand.length;
    act(s, 'twist:13');
    act(s, 'target:0:1:1');
    expect(s.battle!.cursor).toBe(1);
    expect(s.jobs[0].p).toBe(0);
    expect(s.players[0].hand.length).toBe(n - 1);
  });
  it('skips a future space changed to memory-only, without canceling conflict', () => {
    const s = start([0, 1, 0, 1]);
    hand(s, 0, 11);
    act(s, 'twist:11');
    act(s, 'upgrade:0:2:valor');
    expect(s.battle!.cursor).toBe(1);
    act(s, 'pass');
    expect(s.battle!.cursor).toBe(3);
  });
  it('grants overflow-only participants no Twist opportunity', () => {
    const s = fresh(5);
    put(s, 0, 0);
    put(s, 1, 0);
    s.players[1].supply--;
    s.books[0].overflow[1] = 1;
    s.players[0].page = 1;
    act(s, 'placeHere:2');
    expect(s.battle!.participants).toContain(1);
    for (let i = 0; i < 3; i++) {
      expect(s.jobs[0].p).toBe(0);
      act(s, 'pass');
    }
    expect(s.jobs[0].type).toBe('takeToken');
  });
  it('keeps Agamemnon’s empty-space trigger exception but no empty-space check', () => {
    const s = fresh(5);
    give(s, 5);
    put(s, 0, 0);
    s.players[0].page = 1;
    act(s, 'placeHere:2');
    expect(s.battle?.book).toBe(0);
    act(s, 'pass');
    expect(s.battle!.cursor).toBe(2);
    act(s, 'pass');
    expect(s.jobs[0].type).toBe('takeToken');
  });
  it('Agamemnon grants only one extra Twist across the whole conflict', () => {
    const s = fresh(5);
    give(s, 5);
    put(s, 0, 0);
    s.players[0].page = 1;
    hand(s, 0, 0);
    hand(s, 0, 1);
    hand(s, 0, 2);
    act(s, 'placeHere:2');
    act(s, 'twist:0');
    expect(s.battle!.cursor).toBe(0);
    act(s, 'twist:1');
    expect(s.battle!.cursor).toBe(2);
    act(s, 'twist:2');
    expect(s.jobs[0].type).toBe('takeToken');
    expect(s.battle!.played[0]).toBe(3);
    assertInvariants(s);
  });
});
