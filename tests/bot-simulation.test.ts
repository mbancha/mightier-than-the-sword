import { describe, it, expect } from 'vitest';
import { newGame, applyAction, legalActions, currentPlayer } from '../src/game/engine';
import { chooseBotAction, rankBotActions } from '../src/game/bot';
import { playerView, publicView } from '../src/game/views';
import { characters, content } from '../src/data/catalog';
import {
  DEFAULT_CONFIG,
  runSimulation,
  simulateGame,
  summarize,
  validateConfig,
} from '../src/simulation/runner';
import { playerCSV, renderReport } from '../src/simulation/report';
const fresh = () => newGame({ names: ['A', 'B'], seed: 29 });
const score = (v: ReturnType<typeof playerView>, key: string) =>
  rankBotActions(v, 0).find((a) => a.action.key === key)!.score;
describe('Strategic bots', () => {
  it('prefers a book-changing move that completes the travel Subplot', () => {
    const s = fresh();
    s.players[0].subplot = 0;
    s.players[0].progress = 2;
    s.players[0].page = 1;
    s.jobs = [{ type: 'move', p: 0, source: 'normal', origin: 1, n: 1 }];
    const a = chooseBotAction(playerView(s, 0), 0);
    expect(a.page! >= 2).toBe(true);
  });
  it('values the middle-space Twist plus memory reward over a plain edge space', () => {
    const s = fresh();
    s.players[0].page = 0;
    s.players[0].subplot = 9;
    s.players[0].progress = 2;
    s.jobs = [{ type: 'turn', p: 0 }];
    // Seed 29 starts with Dracula: spaces 0 and 1 are on the left page.
    s.books[0].slots[1].memory = { owner: 0, row: 'insight' };
    const v = playerView(s, 0);
    expect(score(v, 'placeHere:1')).toBeGreaterThan(score(v, 'placeHere:0'));
    expect(chooseBotAction(v, 0).key).toBe('placeHere:1');
  });
  it('prioritizes a memory upgrade that completes its Subplot', () => {
    const s = fresh();
    s.jobs = [{ type: 'turn', p: 0 }];
    s.players[0].subplot = 1;
    s.players[0].progress = 2;
    s.books[0].slots[0].owner = 0;
    expect(chooseBotAction(playerView(s, 0), 0).key).toMatch(/^memoryHere:/);
  });
  it('does not spend an activation on an empty Achilles erasure', () => {
    const s = fresh();
    s.jobs = [{ type: 'turn', p: 0 }];
    s.players[0].subplot = null;
    s.characters.push({ id: 3, owner: 0, page: 0, other: null, used: [1, 0], collected: 0 });
    const empty = playerView(s, 0);
    expect(chooseBotAction(empty, 0).key).not.toBe('activate:3:1');
    s.books[0].slots[0].owner = 1;
    s.players[0].subplot = 8;
    s.players[0].progress = 2;
    expect(chooseBotAction(playerView(s, 0), 0).key).toBe('activate:3:1');
  });
  it('seeks erasure targets with Dracula rather than empty pages', () => {
    const s = fresh();
    s.players[0].subplot = 8;
    s.characters.push({ id: 0, owner: 0, page: 0, other: null, used: [0], collected: 0 });
    s.books[0].slots[2].owner = 1;
    s.jobs = [{ type: 'move', p: 0, char: 0, n: 1 }];
    expect(chooseBotAction(playerView(s, 0), 0).page).toBe(1);
  });
  it('saves a pure-power Twist with a secure lead but uses it to turn a loss into a win', () => {
    const v = playerView(fresh(), 0);
    v.prompt = 'battle';
    v.actions = [
      { key: 'twist:1', label: 'Power', group: 'Twist' },
      { key: 'pass', label: 'Pass', group: 'Conflict' },
    ];
    v.battle = {
      book: 0,
      allIgnored: false,
      participants: [0, 1],
      powers: [10, 1],
      winner: null,
      space: 0,
      spaceOwner: 0,
      spacePlayed: 0,
    };
    v.players[0].subplot = null;
    expect(chooseBotAction(v, 0).key).toBe('pass');
    v.battle.powers = [1, 4];
    expect(chooseBotAction(v, 0).key).toBe('twist:1');
  });
  it('recognizes Odysseus replenishment and foreshadowing progress', () => {
    const v = playerView(fresh(), 0);
    v.prompt = 'battle';
    v.players[0].subplot = null;
    v.actions = [
      { key: 'twist:1', label: 'Power', group: 'Twist' },
      { key: 'twist:10', label: 'Foreshadow', group: 'Twist' },
      { key: 'pass', label: 'Pass', group: 'Conflict' },
    ];
    v.battle = {
      book: 0,
      allIgnored: false,
      participants: [0, 1],
      powers: [1, 4],
      winner: null,
      space: 0,
      spaceOwner: 0,
      spacePlayed: 0,
    };
    const before = score(v, 'twist:1');
    v.characters.push({ id: 6, owner: 0, page: 0, other: null, used: [0], collected: 0 });
    expect(score(v, 'twist:1')).toBeGreaterThan(before);
    const without = score(v, 'twist:10');
    v.players[0].subplot = 4;
    v.players[0].progress = 2;
    expect(score(v, 'twist:10')).toBeGreaterThan(without);
  });
  it('is deterministic and ignores opponent hands, hidden powers and deck order', () => {
    const s = fresh(),
      t = structuredClone(s);
    t.players[1].hand = [14, 13];
    t.players[1].horse = 4;
    t.decks.character.reverse();
    t.decks.twist.reverse();
    expect(playerView(s, 0)).toEqual(playerView(t, 0));
    expect(chooseBotAction(playerView(s, 0), 22)).toEqual(chooseBotAction(playerView(t, 0), 22));
  });
});
describe('Headless simulations and statistics', () => {
  it('defaults to 1000 games and rejects invalid or unsafe inputs', () => {
    expect(validateConfig({}).games).toBe(1000);
    for (const games of [0, -1, 1.2, Infinity, 100001])
      expect(() => validateConfig({ games })).toThrow();
    expect(() => validateConfig({ seed: 2147483647 })).toThrow();
    expect(() => validateConfig({ players: 5 as 2 })).toThrow();
  });
  it('emits identical gameplay with telemetry enabled and disabled', () => {
    const setup = { names: ['A', 'B'], seed: 12 },
      a = newGame(setup),
      b = newGame(setup, true);
    for (let i = 0; i < 200 && !a.over; i++) {
      const choice = chooseBotAction(playerView(a, currentPlayer(a)), i);
      expect(applyAction(a, { key: choice.key })).toBeNull();
      expect(applyAction(b, { key: choice.key })).toBeNull();
      const { events, ...rest } = b;
      expect(rest).toEqual(a);
      expect(publicView(b)).toEqual(publicView(a));
    }
  });
  it('records actual upgrades and completions rather than guessing from final ownership', () => {
    const s = newGame({ names: ['A', 'B'], seed: 29 }, true);
    s.events = [];
    s.jobs = [
      { type: 'upgrade', p: 0, page: 0 },
      { type: 'turn', p: 0 },
    ];
    s.books[0].slots[0].owner = 0;
    s.players[0].supply--;
    s.players[0].subplot = 1;
    s.players[0].progress = 2;
    expect(applyAction(s, { key: 'upgrade:0:0:valor' })).toBeNull();
    expect(s.events?.filter((e) => e.type === 'upgrade')).toHaveLength(1);
    expect(applyAction(s, { key: 'character' })).toBeNull();
    expect(s.events?.some((e) => e.type === 'subplotComplete' && e.id === 1)).toBe(true);
  });
  it('reproduces batch results, conserves win shares and scores, and reports each player count separately', async () => {
    const config = { ...DEFAULT_CONFIG, games: 12 },
      r = await runSimulation(config),
      r2 = await runSimulation(config);
    expect(r).toEqual(r2);
    expect(r.failed).toBe(0);
    expect(r.completed).toBe(12);
    for (const g of r.games) {
      expect(g.players.reduce((n, p) => n + p.winShare, 0)).toBeCloseTo(1);
      expect(g.players.reduce((n, p) => n + p.turns, 0)).toBe(g.turns);
      expect(g.players.reduce((n, p) => n + p.points, 0)).toBe(
        Object.values(g.pointSources).reduce((a, b) => a + b, 0),
      );
      expect(g.players.every((p) => p.startingSubplot >= 0)).toBe(true);
      expect(g.players.reduce((n, p) => n + p.conflictWins, 0)).toBe(g.conflicts.length);
      expect(g.players.reduce((n, p) => n + p.subplotsCompleted, 0)).toBe(
        g.offers.filter((o) => o.completed).length,
      );
    }
    expect(r.tables[0].rows.map((r) => r.players)).toEqual([2, 3, 4]);
    expect(playerCSV(r).split('\n')).toHaveLength(37);
    expect(renderReport(r)).toContain('12 completed');
  });
  it('reports capped games as failed with their seed and replay, without contaminating averages', async () => {
    const r = await runSimulation({ games: 2, maxActions: 1 });
    expect(r.failed).toBe(2);
    expect(r.completed).toBe(0);
    expect(r.tables[0].rows).toEqual([]);
    expect(r.games[0].replay).toHaveLength(1);
    expect(r.games[0].seed).toBe(1);
  });
  it('supports cancellation and keeps a usable partial report', async () => {
    let stop = false;
    const r = await runSimulation(
      { games: 30 },
      () => {
        stop = true;
      },
      () => stop,
    );
    expect(r.attempted).toBe(10);
    expect(r.cancelled).toBe(true);
  });
  it('rotates the strategic seat in comparison mode for each player count', () => {
    for (const n of [2, 3, 4] as const) {
      const seats = Array.from(
        { length: n },
        (_, i) =>
          simulateGame(
            { ...DEFAULT_CONFIG, players: n, policy: 'compare', maxActions: 1 },
            i,
          ).players.find((p) => p.policy === 'strategic')!.seat,
      );
      expect(seats).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    }
  });
  it('splits tied wins when producing association tables, without counting multiple completions as multiple owners', () => {
    const g = simulateGame({ ...DEFAULT_CONFIG, players: 2 }, 0);
    g.players.forEach((p) => {
      p.winShare = 0.5;
      p.characters = [0];
      p.completed = [1, 1];
    });
    const r = summarize({ ...DEFAULT_CONFIG, games: 1 }, [g]);
    const c = r.tables.find((t) => t.title === 'Characters')!.rows[0];
    expect(c.samples).toBe(2);
    expect(c.winShare).toBe(0.5);
    const sp = r.tables
      .find((t) => t.title === 'Subplots')!
      .rows.find((row) => row.name === 'A Name in Every Song')!;
    expect(sp.completers).toBe(2);
    expect(sp.completeWin).toBe(0.5);
  });
});
