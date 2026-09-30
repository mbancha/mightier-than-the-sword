import { describe, it, expect } from 'vitest';
import {
  newGame,
  legalActions,
  applyAction,
  assertInvariants,
  currentPlayer,
} from '../src/game/engine';
import {
  publicationSites,
  initialHexes,
  adjacentBooks,
  pageNeighbors,
  distance,
} from '../src/game/topology';
import { chooseBotAction } from '../src/game/bot';
import { playerView, publicView } from '../src/game/views';
import { createSession, advance, exportSession, importSession } from '../src/game/session';
const make = () => newGame({ names: ['A', 'B'], seed: 29, controllers: ['human', 'bot'] });
const act = (s: ReturnType<typeof make>, key: string) =>
  expect(applyAction(s, { key }), key).toBeNull();
describe('Growing hex map', () => {
  it('starts with just three books, with the lower book touching both top books', () => {
    const s = make();
    expect(s.books.map(({ q, r }) => ({ q, r }))).toEqual(initialHexes);
    expect(s.unpublished).toHaveLength(6);
    expect(s.books.every((b) => s.books.filter((x) => adjacentBooks(b, x)).length === 2)).toBe(
      true,
    );
    expect(legalActions(s).every((a) => a.page! < 6)).toBe(true);
  });
  it('only offers empty hex sites touching at least two existing books', () => {
    const s = make();
    s.jobs = [
      { type: 'publish', p: 0 },
      { type: 'turn', p: 0 },
    ];
    const expected = s.unpublished[0],
      choice = legalActions(s)[0];
    for (const site of publicationSites(s.books))
      expect(s.books.filter((b) => adjacentBooks(b, site)).length).toBeGreaterThanOrEqual(2);
    const before = structuredClone(s);
    expect(applyAction(s, { key: 'publish:50:50' })).not.toBeNull();
    expect(s).toEqual(before);
    act(s, choice.key);
    expect(s.books[3].id).toBe(expected);
    expect(s.unpublished).toHaveLength(5);
    expect(s.jobs[0].type).toBe('publishOverflow');
    expect(
      legalActions(s).every((a) => a.book !== 3 && adjacentBooks(s.books[a.book!], s.books[3])),
    ).toBe(true);
    const bonus = legalActions(s).find((a) => s.books[a.book!].id !== 0)!;
    act(s, bonus.key);
    expect(s.books[bonus.book!].overflow[0]).toBe(1);
    expect(s.players[0].supply).toBe(3);
  });
  it('permits any number of touching neighbors, and cannot place over an existing book', () => {
    const map = [...initialHexes, { q: 1, r: 1 }];
    expect(
      publicationSites(map).every((site) => !map.some((b) => b.q === site.q && b.r === site.r)),
    ).toBe(true);
  });
  it('step movement spends one point at a time, permits stopping, and rejects distant drops', () => {
    const s = make();
    s.jobs = [
      { type: 'move', p: 0, n: 2, source: 'normal' },
      { type: 'turn', p: 0 },
    ];
    const before = structuredClone(s);
    expect(applyAction(s, { key: 'step:5' })).not.toBeNull();
    expect(s).toEqual(before);
    act(s, 'step:1');
    expect(s.players[0].page).toBe(1);
    expect(s.jobs[0].n).toBe(1);
    act(s, 'step:4');
    expect(s.players[0].page).toBe(4);
    expect(s.jobs[0].n).toBe(0);
    expect(legalActions(s).some((a) => a.key.startsWith('step:'))).toBe(false);
    act(s, 'endMove');
    expect(s.jobs[0].type).toBe('turn');
  });
  it('connects only touching halves, with symmetric shortest paths after publication', () => {
    const map = [...initialHexes, { q: -1, r: 1 }];
    for (let p = 0; p < 8; p++)
      for (const q of pageNeighbors(map, p)) {
        expect(pageNeighbors(map, q)).toContain(p);
        expect(distance(map, p, q)).toBe(1);
      }
    expect(distance(map, 0, 7)).toBe(1);
    expect(distance(map, 0, 8)).toBe(Infinity);
  });
  it('preserves controllers and step choices in saved replays', () => {
    let s = createSession({ names: ['A', 'B'], seed: 8, controllers: ['human', 'bot'] });
    for (const key of ['page:0', 'page:0', 'step:1', 'endMove', 'place', 'place:2']) {
      if (legalActions(s.history.at(-1)!).some((a) => a.key === key)) s = advance(s, { key });
    }
    expect(importSession(exportSession(s))).toEqual(s);
  });
});
describe('Basic bots', () => {
  it('uses only the acting player projection and cannot see unpublished order or other hands', () => {
    const s = make(),
      copy = structuredClone(s);
    copy.unpublished.reverse();
    copy.players[1].hand.reverse();
    copy.players[1].horse = 4;
    copy.decks.character.reverse();
    expect(publicView(copy)).toEqual(publicView(s));
    expect(chooseBotAction(playerView(copy, 0), 3)).toEqual(chooseBotAction(playerView(s, 0), 3));
  });
  it('completes 24 mixed-size games, including publication, without illegal decisions', () => {
    let published = 0,
      conflicts = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const n = 2 + (seed % 3),
        s = newGame({
          names: ['A', 'B', 'C', 'D'].slice(0, n),
          seed,
          controllers: Array(n).fill('bot'),
        });
      let step = 0;
      while (!s.over && step < 2000) {
        const a = chooseBotAction(playerView(s, currentPlayer(s)), step++);
        act(s, a.key);
        assertInvariants(s);
      }
      expect(s.over, `seed ${seed} at ${step}`).toBe(true);
      published += s.books.length - 3;
      conflicts += s.log.filter((l) => l.startsWith('Conflict at')).length;
    }
    expect(published).toBeGreaterThan(20);
    expect(conflicts).toBeGreaterThan(20);
  }, 60000);
});
