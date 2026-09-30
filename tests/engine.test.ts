import { describe, it, expect } from 'vitest';
import {
  newGame,
  legalActions,
  applyAction,
  assertInvariants,
  fullBooks,
  power,
} from '../src/game/engine';
import { createSession, advance, undo, exportSession, importSession } from '../src/game/session';
import { publicView, playerView } from '../src/game/views';
import { content, books, characters, twists, subplots, tokens, ROWS } from '../src/data/catalog';
import { distance, initialHexes } from '../src/game/topology';
import { makeRng, nextInt } from '../src/kernel/rng';
import type { GameState, Job } from '../src/game/types';
const fresh = (seed = 17, n = 2) =>
  newGame({ names: ['Teal', 'Amber', 'Rose', 'Violet'].slice(0, n), seed });
const act = (s: GameState, key: string) => {
  const error = applyAction(s, { key });
  expect(error, key).toBeNull();
};
const put = (s: GameState, p: number, b: number, k: number) => {
  s.players[p].supply--;
  s.books[b].slots[k].owner = p;
};
const ensureBook = (s: GameState, id: number) => {
  const existing = s.books.findIndex((b) => b.id === id);
  if (existing >= 0) return existing;
  const old = s.books[0].id;
  s.unpublished[s.unpublished.indexOf(id)] = old;
  s.books[0].id = id;
  s.books[0].slots = books[id].page_slots.flatMap((n, page) =>
    Array.from({ length: n }, () => ({ page, owner: null, memory: null })),
  );
  return 0;
};
const give = (s: GameState, p: number, id: number) => {
  s.decks.character = s.decks.character.filter((x) => x !== id);
  s.characters.push({
    id,
    owner: p,
    page: s.players[p].page,
    other: null,
    used: characters[id].actions.map(() => 0),
    collected: 0,
  });
};
const hand = (s: GameState, p: number, id: number) => {
  s.decks.twist = s.decks.twist.filter((x) => x !== id);
  s.discards.twist = s.discards.twist.filter((x) => x !== id);
  s.players.forEach((x) => (x.hand = x.hand.filter((x) => x !== id)));
  s.players[p].hand.push(id);
};
function only(s: GameState, j: Job) {
  s.jobs = [j, { type: 'turn', p: 0 }];
}

describe('Current source and topology', () => {
  it('imports every component and current terminology', () => {
    expect([
      books.length,
      twists.length,
      subplots.length,
      characters.length,
      tokens.length,
      content.horse.length,
    ]).toEqual([9, 15, 10, 10, 15, 5]);
    expect(JSON.stringify(content)).not.toMatch(/\b(?:ink|unlock\w*|sidekick|bookmark)\b/i);
    for (const b of books) {
      expect(b.slots).toBe(b.page_slots[0] + b.page_slots[1]);
      expect(Math.abs(b.page_slots[0] - b.page_slots[1])).toBeLessThanOrEqual(1);
    }
  });
  it('connects page folds and adjoining books without row wrapping', () => {
    expect(distance(initialHexes, 0, 1)).toBe(1);
    expect(distance(initialHexes, 1, 2)).toBe(1);
    expect(distance(initialHexes, 1, 4)).toBe(1);
    expect(distance(initialHexes, 2, 5)).toBe(1);
    expect(distance(initialHexes, 0, 4)).toBe(2);
    expect(distance(initialHexes, 0, 6)).toBe(Infinity);
  });
});
describe('Determinism, privacy and resource accounting', () => {
  it('reproduces shuffled setup', () => {
    expect(fresh()).toEqual(fresh());
    expect(fresh(18).books).not.toEqual(fresh().books);
    assertInvariants(fresh());
  });
  it('deals one distinct face-up Subplot to every human and bot before setup in 2-4 player games', () => {
    for (const n of [2, 3, 4]) {
      const s = newGame({
        names: ['A', 'B', 'C', 'D'].slice(0, n),
        seed: 29,
        controllers: Array.from({ length: n }, (_, i) => (i % 2 ? 'bot' : 'human')),
      });
      const dealt = s.players.map((p) => p.subplot);
      expect(dealt.every((id) => id !== null && subplots.some((card) => card.id === id))).toBe(
        true,
      );
      expect(new Set(dealt).size).toBe(n);
      expect(s.decks.subplot).toHaveLength(subplots.length - n);
      expect(dealt.every((id) => !s.decks.subplot.includes(id!))).toBe(true);
      expect(s.players.every((p) => p.progress === 0)).toBe(true);
      expect(publicView(s).players.map((p) => p.subplot)).toEqual(dealt);
      assertInvariants(s);
    }
  });
  it('rejects illegal actions without mutation', () => {
    const s = fresh(),
      before = structuredClone(s);
    expect(applyAction(s, { key: 'cheat' })).not.toBeNull();
    expect(s).toEqual(before);
  });
  it('undo and replay recover exactly the same random state and choices', () => {
    let ss = createSession({ names: ['A', 'B'], seed: 44 });
    for (let i = 0; i < 20; i++) {
      const a = legalActions(ss.history.at(-1)!)[0];
      ss = advance(ss, { key: a.key });
    }
    expect(importSession(exportSession(ss))).toEqual(ss);
    const u = undo(ss);
    expect(advance(u, ss.actions.at(-1)!)).toEqual(ss);
    expect(() => importSession({ ...exportSession(ss), rulesVersion: 'wrong' })).toThrow();
  });
  it('never exports decks, seed, opponent hands or Horse secrets through projections', () => {
    const s = fresh(),
      other = structuredClone(s);
    other.rng.s++;
    other.seed++;
    other.decks.twist.reverse();
    other.players[1].hand.reverse();
    other.players[1].horse = 3;
    expect(publicView(other)).toEqual(publicView(s));
    expect(playerView(other, 0)).toEqual(playerView(s, 0));
    expect(JSON.stringify(publicView(s))).not.toContain('"seed"');
  });
  it('selects exactly one token per player per Act', () => {
    for (const n of [2, 3, 4]) {
      const s = fresh(5, n);
      expect(s.pools.map((x) => x.length)).toEqual([n, n, n]);
    }
  });
});
describe('Memories and Inklings', () => {
  it('upgrades suspend the Inkling, leave the spot empty and add no power', () => {
    const s = fresh();
    put(s, 0, 0, 0);
    const page = s.books[0].slots[0].page;
    s.players[0].page = page;
    only(s, { type: 'upgrade', p: 0, page });
    act(s, 'upgrade:0:0:valor');
    expect(s.players[0].reserves[1]).toBe(4);
    expect(s.books[0].slots[0].owner).toBeNull();
    expect(s.players[0].rows.valor).toBe(1);
    expect(power(s, 0, 0)).toBe(1);
  });
  it('shares memory reward with placer and owner exactly once each', () => {
    const s = fresh();
    s.players[0].rows.valor = 1;
    s.books[0].slots[0].memory = { owner: 0, row: 'valor' };
    only(s, { type: 'place', p: 1, page: s.books[0].slots[0].page, n: 1 });
    act(s, 'place:0');
    expect(s.players[0].points).toBe(1);
    expect(s.players[1].points).toBe(1);
  });
  it('does not double-pay when placer owns the memory', () => {
    const s = fresh();
    s.players[0].rows.valor = 1;
    s.books[0].slots[0].memory = { owner: 0, row: 'valor' };
    only(s, { type: 'place', p: 0, page: s.books[0].slots[0].page, n: 1 });
    act(s, 'place:0');
    expect(s.players[0].points).toBe(1);
  });
  it('returns a memory as An Unlikely Champion cost and keeps the occupant', () => {
    const s = fresh();
    s.players[0].rows.valor = 1;
    s.books[0].slots[0].memory = { owner: 0, row: 'valor' };
    put(s, 1, 0, 0);
    only(s, { type: 'returnMemory', p: 0, book: 0 });
    act(s, 'memory:0');
    expect(s.players[0].rows.valor).toBe(0);
    expect(s.books[0].slots[0].owner).toBe(1);
    expect(s.characters.length).toBe(1);
  });
  it('does not offer An Unlikely Champion without the cost', () => {
    const s = fresh();
    hand(s, 0, 12);
    s.jobs = [{ type: 'turn', p: 0 }];
    expect(legalActions(s).some((a) => a.key === 'twist:12')).toBe(false);
  });
  it('foreshadows only from next reserve, with fallback points', () => {
    const s = fresh();
    s.players[0].supply += 2;
    s.players[0].reserves[1] = 1;
    hand(s, 0, 10);
    only(s, { type: 'optionalForeshadow', p: 0 });
    act(s, 'foreshadow');
    only(s, { type: 'optionalForeshadow', p: 0 });
    act(s, 'foreshadow');
    expect(s.players[0].reserves[1]).toBe(0);
    expect(s.players[0].reserves[2]).toBe(3);
    expect(s.players[0].points).toBe(1);
  });
  it('suspends overflow in the submarine to the next reserve', () => {
    const s = fresh(),
      b = ensureBook(s, 0);
    only(s, { type: 'place', p: 0, book: b, mode: 'overflow', n: 1 });
    act(s, 'place:null');
    expect(s.players[0].supply).toBe(5);
    expect(s.players[0].reserves[1]).toBe(4);
    expect(s.books[b].overflow[0]).toBe(0);
  });
  it('requires all slots across both pages before conflict', () => {
    const s = fresh(),
      b = ensureBook(s, 5);
    put(s, 0, b, 0);
    expect(fullBooks(s)).not.toContain(b);
    put(s, 0, b, 1);
    put(s, 0, b, 2);
    expect(fullBooks(s)).toContain(b);
  });
});
describe('Characters and card-specific decisions', () => {
  it('activation consumes supply and observes capacity', () => {
    const s = fresh();
    give(s, 0, 3);
    s.jobs = [{ type: 'turn', p: 0 }];
    act(s, 'activate:3:0');
    expect(s.players[0].supply).toBe(5);
    expect(s.characters[0].used[0]).toBe(1);
    act(s, 'page:0');
    s.acted = false;
    expect(legalActions(s).some((a) => a.key === 'activate:3:0')).toBe(false);
  });
  it('Jekyll coin flips replay deterministically', () => {
    const s = fresh();
    give(s, 0, 2);
    s.jobs = [{ type: 'turn', p: 0 }];
    const t = structuredClone(s);
    act(s, 'activate:2:0');
    act(t, 'activate:2:0');
    expect(s).toEqual(t);
  });
  it('Frankenstein collection conserves Inklings and becomes 5 power', () => {
    const s = fresh();
    give(s, 0, 1);
    const c = s.characters[0];
    c.collected = 2;
    s.players[0].supply = 4;
    only(s, { type: 'collect', p: 0 });
    act(s, 'collect');
    expect(c.collected).toBe(2);
    expect(s.characters[0].collected).toBe(3);
    expect(power(s, 0, 0)).toBeGreaterThanOrEqual(5);
  });
});
describe('Conflict tokens and Acts', () => {
  function rewardState(covered: boolean) {
    const s = fresh();
    s.pools = [
      [0, 1],
      [5, 6],
      [10, 11],
    ];
    s.books[0].covered = covered;
    s.battle = {
      book: 0,
      participants: [0, 1],
      bonus: [0, 0],
      played: [0, 0],
      ignored: [],
      allIgnored: false,
      hero: [],
      revenge: [],
      tribute: [],
      complete: [],
      cursor: 0,
      slotOwner: 0,
      slotPlayed: 0,
      extraUsed: [],
      winner: 0,
      cards: [],
    };
    s.jobs = [
      { type: 'takeToken', p: 0 },
      { type: 'turn', p: 0 },
    ];
    return s;
  }
  it('keeps combat cards out of a reshuffle until scoring, including Odysseus draws', () => {
    const s = rewardState(false);
    give(s, 0, 6);
    hand(s, 0, 1);
    for (const id of s.decks.twist.splice(0)) s.players[1].hand.push(id);
    s.discards.twist = [];
    put(s, 0, 0, 0);
    put(s, 1, 0, 1);
    s.battle!.winner = null;
    s.jobs = [{ type: 'battle', p: 0 }];
    act(s, 'twist:1');
    expect(s.battle!.cards).toEqual([1]);
    expect(s.players[0].hand).not.toContain(1);
    expect(s.discards.twist).not.toContain(1);
  });
  it('suspends Aeneid Inklings but leaves characters and memories in place', () => {
    const s = fresh(),
      b = ensureBook(s, 5);
    s.players[0].page = b * 2;
    s.players[1].page = b * 2 + 1;
    give(s, 0, 3);
    put(s, 0, b, 0);
    put(s, 1, b, 1);
    put(s, 0, b, 2);
    s.players[0].rows.valor = 1;
    s.players[0].everUpgraded = ['valor'];
    s.books[b].slots[0].memory = { owner: 0, row: 'valor' };
    s.jobs = [{ type: 'resolve', p: 0 }];
    act(s, `conflict:${b}`);
    for (let i = 0; i < 3; i++) act(s, 'pass');
    expect(s.jobs[0].type).toBe('takeToken');
    expect(s.books[b].slots.every((x) => x.owner === null)).toBe(true);
    expect(s.books[b].slots[0].memory).toEqual({ owner: 0, row: 'valor' });
    expect(s.characters[0].page).toBe(b * 2);
    expect(s.players[0].supply).toBe(4);
  });
  it('can collect strong rewards of previous Acts without reapplying their multiplier', () => {
    const s = rewardState(false);
    s.act = 2;
    s.pools[1] = [5, 6];
    s.books[0].tokens = [{ id: 1, strong: true }];
    act(s, 'token:5');
    expect(s.players[0].points).toBe(6);
    act(s, 'reward:1');
    expect(s.players[0].points).toBe(6);
    expect(s.players[0].reserves[2]).toBe(1);
  });
  it('every conflict consumes a token, but covered books award no printed points', () => {
    for (const covered of [true, false]) {
      const s = rewardState(covered);
      act(s, 'token:1');
      expect(s.players[0].points).toBe(covered ? 0 : 3);
      expect(s.pools[0]).toEqual([0]);
      act(s, 'reward:1');
      expect(s.books[0].tokens[0].strong).toBe(false);
    }
  });
  it('older tokens award face-up benefit without multiplying points', () => {
    const s = rewardState(false);
    s.books[0].tokens = [{ id: 6, strong: false }];
    act(s, 'token:1');
    act(s, 'reward:6');
    expect(s.players[0].points).toBe(5);
    act(s, 'reward:1');
    expect(s.players[0].points).toBe(5);
  });
  it('last token ends Act after rewards, flips old tokens and uncovers books', () => {
    const s = rewardState(false);
    s.pools[0] = [1];
    act(s, 'token:1');
    expect(s.act).toBe(1);
    act(s, 'reward:1');
    expect(s.jobs[0].type).toBe('publish');
    act(s, legalActions(s)[0].key);
    act(s, legalActions(s)[0].key);
    expect(s.act).toBe(2);
    expect(s.books[0].covered).toBe(false);
    expect(s.books[0].tokens[0].strong).toBe(true);
    expect(s.players[0].reserves[1]).toBe(0);
    expect(s.active).toBe(1);
  });
  it('shoot the moon awards bonuses without book multiplier and reaches next Act', () => {
    const s = fresh();
    for (let i = 0; i < 4; i++) put(s, 0, 0, i % s.books[0].slots.length); // use overflow below instead to conserve on a 3-slot book
    s.books[0].slots.forEach((x) => (x.owner = null));
    s.books[0].overflow[0] = 4;
    s.pools[0] = [1];
    s.jobs = [{ type: 'moon', p: 0 }];
    act(s, 'token:1');
    expect(s.act).toBe(2);
    expect(s.players[0].points).toBe(0);
    expect(s.books[0].tokens.length).toBe(0);
  });
});
describe('Bounded randomized legal play', () => {
  it('finishes complete games while conserving all pieces', () => {
    for (let seed = 1; seed <= 36; seed++) {
      const s = fresh(seed, 2 + (seed % 3)),
        r = makeRng(seed * 123);
      let steps = 0;
      while (!s.over && steps++ < 3000) {
        const actions = legalActions(s);
        expect(actions.length, `seed ${seed}, ${s.jobs[0]?.type}`).toBeGreaterThan(0);
        const a = actions[nextInt(r, actions.length)];
        const error = applyAction(s, { key: a.key });
        expect(error, `seed ${seed}, ${steps}, ${s.jobs[0]?.type}, ${a.key}`).toBeNull();
        assertInvariants(s);
      }
      expect(s.over, `seed ${seed}, steps ${steps}`).toBe(true);
    }
  }, 60000);
});
