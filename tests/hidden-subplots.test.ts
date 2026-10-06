import { describe, expect, it } from 'vitest';
import { applyAction, newGame } from '../src/game/engine';
import { subplotScore } from '../src/game/subplots';
import { playerView, publicView } from '../src/game/views';
import type { Row } from '../src/data/catalog';
const fresh = () => newGame({ names: ['A', 'B'], seed: 29 });
type State = ReturnType<typeof fresh>;
function memory(s: State, b: number, k: number, row: Row = 'valor', owner = 0) {
  s.books[b].slots[k].memory = { owner, row };
  s.players[owner].rows[row]++;
}
function ink(s: State, b: number, k: number, owner = 0) {
  s.books[b].slots[k].owner = owner;
  s.players[owner].supply--;
}
function battle(s: State, b: number) {
  return { ...s, battle: { book: b, participants: [0, 1] } };
}
describe('Hidden board-state Subplots', () => {
  it('checks three distinct books and the Quill location', () => {
    const s = fresh();
    memory(s, 0, 0);
    memory(s, 0, 1);
    memory(s, 1, 0);
    expect(subplotScore(s, 0, 0)).toBeLessThan(1);
    memory(s, 2, 0);
    expect(subplotScore(s, 0, 0)).toBe(1);
  });
  it('requires three different tracks, not three upgrades in one track', () => {
    const s = fresh();
    s.players[0].rows.valor = 3;
    expect(subplotScore(s, 0, 1)).toBeLessThan(1);
    s.players[0].rows.insight = 1;
    s.players[0].rows.curiosity = 1;
    expect(subplotScore(s, 0, 1)).toBe(1);
  });
  it('requires memories on opposite pages and an own figure on that book', () => {
    const s = fresh();
    memory(s, 0, 0);
    memory(s, 0, 1);
    expect(subplotScore(s, 0, 2)).toBeLessThan(1);
    memory(s, 0, 2);
    expect(subplotScore(s, 0, 2)).toBe(1);
    s.players[0].page = 2;
    expect(subplotScore(s, 0, 2)).toBeLessThan(1);
    s.characters.push({ id: 3, owner: 0, page: 0, other: null, used: [0, 0], collected: 0 });
    expect(subplotScore(s, 0, 2)).toBe(1);
  });
  it('requires different types on the same page, where the Quill is', () => {
    const s = fresh();
    memory(s, 0, 0);
    memory(s, 0, 1);
    expect(subplotScore(s, 0, 3)).toBeLessThan(1);
    s.books[0].slots[1].memory!.row = 'insight';
    expect(subplotScore(s, 0, 3)).toBe(1);
    s.players[0].page = 1;
    expect(subplotScore(s, 0, 3)).toBeLessThan(1);
  });
  it('requires the specified Resolve and Curiosity levels', () => {
    const s = fresh();
    s.players[0].rows.resolve = 2;
    expect(subplotScore(s, 0, 4)).toBeLessThan(1);
    s.players[0].rows.curiosity = 1;
    expect(subplotScore(s, 0, 4)).toBe(1);
    s.players[0].rows.resolve = 1;
    expect(subplotScore(s, 0, 4)).toBeLessThan(1);
  });
  it('requires an opponent on your memory, not just anywhere on the book', () => {
    const s = fresh();
    memory(s, 0, 0);
    memory(s, 0, 1);
    ink(s, 0, 2, 1);
    expect(subplotScore(s, 0, 5)).toBeLessThan(1);
    ink(s, 0, 0, 1);
    expect(subplotScore(s, 0, 5)).toBe(1);
  });
  it('requires current conflict participation with Insight 2 and an Insight memory there', () => {
    const s = fresh();
    memory(s, 0, 0, 'insight');
    memory(s, 1, 0, 'insight');
    expect(subplotScore(s, 0, 6)).toBeLessThan(1);
    const v = battle(s, 0);
    expect(subplotScore(v, 0, 6)).toBe(1);
    v.battle.participants = [1];
    expect(subplotScore(v, 0, 6)).toBeLessThan(1);
    expect(subplotScore(battle(s, 2), 0, 6)).toBeLessThan(1);
  });
  it('requires Quill, own Valor memory and participation in the same current conflict', () => {
    const s = fresh();
    memory(s, 0, 0);
    expect(subplotScore(battle(s, 0), 0, 7)).toBe(1);
    s.players[0].page = 2;
    expect(subplotScore(battle(s, 0), 0, 7)).toBeLessThan(1);
  });
  it('requires both end spaces on one book, and loses eligibility if a memory returns', () => {
    const s = fresh();
    memory(s, 0, 0);
    memory(s, 1, s.books[1].slots.length - 1);
    expect(subplotScore(s, 0, 8)).toBeLessThan(1);
    memory(s, 0, s.books[0].slots.length - 1);
    expect(subplotScore(s, 0, 8)).toBe(1);
    s.books[0].slots[0].memory = null;
    expect(subplotScore(s, 0, 8)).toBeLessThan(1);
  });
  it('requires an own Inkling on an own memory with a second type on the same book', () => {
    const s = fresh();
    memory(s, 0, 0);
    memory(s, 0, 1, 'insight');
    expect(subplotScore(s, 0, 9)).toBeLessThan(1);
    ink(s, 0, 0);
    expect(subplotScore(s, 0, 9)).toBe(1);
    s.books[0].slots[0].memory!.owner = 1;
    expect(subplotScore(s, 0, 9)).toBeLessThan(1);
  });
  it('reveals on fulfillment, preserves reward choice, and prevents replacement reward loops', () => {
    const s = fresh();
    s.players[0].subplot = 1;
    s.players[1].subplot = null;
    memory(s, 1, 0, 'curiosity');
    memory(s, 2, 0, 'insight');
    ink(s, 0, 0);
    s.jobs = [
      { type: 'upgrade', p: 0, page: 0 },
      { type: 'turn', p: 0 },
    ];
    expect(applyAction(s, { key: 'upgrade:0:0:valor' })).toBeNull();
    expect(s.jobs[0].type).toBe('subplot');
    expect(applyAction(s, { key: 'character' })).toBeNull();
    expect(s.characters).toHaveLength(1);
    expect(s.players[0].subplot).not.toBeNull();
    expect(s.players[0].subplotTurn).toBe(s.turn);
    expect(s.jobs[0].type).not.toBe('subplot');
  });
  it('exposes no unfinished opponent objective or counter to public, player or bot views', () => {
    const s = fresh(),
      t = structuredClone(s);
    t.players[1].subplot = (s.players[1].subplot! + 1) % 10;
    expect(publicView(s)).toEqual(publicView(t));
    expect(playerView(s, 0)).toEqual(playerView(t, 0));
    expect(playerView(s, 0).players[0].subplot).toBe(s.players[0].subplot);
    expect(playerView(s, 1).players[0].subplot).toBeNull();
  });
});
