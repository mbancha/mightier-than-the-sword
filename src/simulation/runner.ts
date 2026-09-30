import { newGame, applyAction, currentPlayer } from '../game/engine';
import { playerView } from '../game/views';
import { chooseBotAction, BOT_VERSION } from '../game/bot';
import { chooseBasicBotAction } from '../game/basicBot';
import { books, characters, subplots, twists, tokens, ROWS, content } from '../data/catalog';
export interface SimulationConfig {
  games: number;
  players: 2 | 3 | 4 | 'mixed';
  seed: number;
  policy: 'strategic' | 'basic' | 'compare';
  maxActions: number;
}
export const DEFAULT_CONFIG: SimulationConfig = {
  games: 1000,
  players: 'mixed',
  seed: 1,
  policy: 'strategic',
  maxActions: 5000,
};
export interface PlayerResult {
  seat: number;
  policy: string;
  points: number;
  winShare: number;
  turns: number;
  upgrades: number;
  subplotsCompleted: number;
  characters: number[];
  characterActs: Record<number, number>;
  activations: Record<number, number>;
  startingSubplot: number;
  offered: number[];
  completed: number[];
  rows: Record<string, number>;
  twists: Record<number, number>;
  tokens: Record<number, number>;
  placements: number;
  overflowPlacements: number;
  foreshadowed: number;
  erasures: number;
  memoryRewards: number;
  moons: number;
  conflictWins: number;
  conflicts: number;
}
export interface ConflictResult {
  book: number;
  act: number;
  winner: number;
  participants: number[];
  characters: { id: number; owner: number }[];
  twists: { id: number; player: number }[];
}
export interface Offer {
  id: number;
  player: number;
  turn: number;
  act: number;
  completed: boolean;
  elapsedTurns: number | null;
}
export interface GameResult {
  seed: number;
  playerCount: number;
  status: 'complete' | 'failed';
  error?: string;
  actions: number;
  turns: number;
  replay?: string[];
  players: PlayerResult[];
  conflicts: ConflictResult[];
  offers: Offer[];
  pointSources: Record<string, number>;
  publishedBooks: number[];
}
export interface Column {
  key: string;
  label: string;
  format?: 'percent' | 'decimal';
}
export interface Table {
  title: string;
  description: string;
  columns: Column[];
  rows: Record<string, string | number | null>[];
}
export interface Report {
  config: SimulationConfig;
  rulesVersion: string;
  botVersion: string;
  catalogFingerprint: string;
  attempted: number;
  completed: number;
  failed: number;
  cancelled: boolean;
  tables: Table[];
  games: GameResult[];
}
export function validateConfig(input: Partial<SimulationConfig>): SimulationConfig {
  const c = { ...DEFAULT_CONFIG, ...input };
  if (!Number.isSafeInteger(c.games) || c.games < 1 || c.games > 100000)
    throw Error('Games must be a whole number from 1 to 100,000.');
  if (![2, 3, 4, 'mixed'].includes(c.players))
    throw Error('Choose 2, 3, 4 or mixed player counts.');
  if (!['strategic', 'basic', 'compare'].includes(c.policy))
    throw Error('Choose strategic, basic or compare bots.');
  if (!Number.isSafeInteger(c.seed) || c.seed < 0 || c.seed + c.games > 2147483647)
    throw Error('Seed range must stay between 0 and 2,147,483,647.');
  if (!Number.isSafeInteger(c.maxActions) || c.maxActions < 1 || c.maxActions > 20000)
    throw Error('Action limit must be 1–20,000.');
  return c;
}
export function simulateGame(config: SimulationConfig, index: number): GameResult {
  const n = config.players === 'mixed' ? 2 + (index % 3) : config.players;
  const seed = config.seed + index;
  const policies = Array.from({ length: n }, (_, p) =>
    config.policy === 'compare'
      ? p === Math.floor(index / (config.players === 'mixed' ? 3 : 1)) % n
        ? 'strategic'
        : 'basic'
      : config.policy,
  );
  const s = newGame(
    {
      names: ['Teal', 'Amber', 'Rose', 'Violet'].slice(0, n),
      seed,
      controllers: Array(n).fill('bot'),
    },
    true,
  );
  const result: GameResult = {
    seed,
    playerCount: n,
    status: 'failed',
    actions: 0,
    turns: 0,
    players: s.players.map((_, p) => ({
      seat: p + 1,
      policy: policies[p],
      points: 0,
      winShare: 0,
      turns: 0,
      upgrades: 0,
      subplotsCompleted: 0,
      characters: [],
      characterActs: {},
      activations: {},
      startingSubplot: s.players[p].subplot!,
      offered: [],
      completed: [],
      rows: {},
      twists: {},
      tokens: {},
      placements: 0,
      overflowPlacements: 0,
      foreshadowed: 0,
      erasures: 0,
      memoryRewards: 0,
      moons: 0,
      conflictWins: 0,
      conflicts: 0,
    })),
    conflicts: [],
    offers: [],
    pointSources: {},
    publishedBooks: [],
  };
  let pendingTwists: { id: number; player: number }[] = [];
  const increment = (record: Record<number, number>, id: number, n = 1) =>
    (record[id] = (record[id] ?? 0) + n);
  const consume = () => {
    for (const e of s.events!.splice(0)) {
      const p = result.players[e.player];
      switch (e.type) {
        case 'turn':
          p.turns++;
          break;
        case 'points':
          result.pointSources[e.source!] = (result.pointSources[e.source!] ?? 0) + e.amount!;
          break;
        case 'subplotDraw':
          p.offered.push(e.id!);
          result.offers.push({
            id: e.id!,
            player: e.player,
            turn: e.turn,
            act: e.act,
            completed: false,
            elapsedTurns: null,
          });
          break;
        case 'subplotComplete': {
          p.subplotsCompleted++;
          p.completed.push(e.id!);
          const offer = [...result.offers]
            .reverse()
            .find((o) => o.id === e.id && o.player === e.player && !o.completed);
          if (offer) {
            offer.completed = true;
            offer.elapsedTurns = e.turn - offer.turn;
          }
          break;
        }
        case 'character':
          p.characters.push(e.id!);
          p.characterActs[e.id!] = e.act;
          break;
        case 'activate':
          increment(p.activations, e.id!);
          break;
        case 'upgrade':
          p.upgrades++;
          p.rows[e.row!] = (p.rows[e.row!] ?? 0) + 1;
          break;
        case 'place':
          if (e.source === 'numbered') p.placements++;
          else p.overflowPlacements++;
          break;
        case 'foreshadow':
          p.foreshadowed += e.amount!;
          break;
        case 'erase':
          p.erasures++;
          break;
        case 'memoryReward':
          p.memoryRewards++;
          break;
        case 'moon':
          p.moons++;
          break;
        case 'twist':
          increment(p.twists, e.id!);
          pendingTwists.push({ id: e.id!, player: e.player });
          break;
        case 'token':
          increment(p.tokens, e.id!);
          break;
        case 'conflictStart':
          pendingTwists = [];
          break;
        case 'conflictEnd':
          result.conflicts.push({
            book: e.book!,
            act: e.act,
            winner: e.player,
            participants: e.participants!,
            characters: e.characters!,
            twists: pendingTwists,
          });
          p.conflictWins++;
          e.participants!.forEach((i) => result.players[i].conflicts++);
          break;
      }
    }
  };
  const actions: string[] = [];
  try {
    consume();
    while (!s.over && actions.length < config.maxActions) {
      const p = currentPlayer(s),
        view = playerView(s, p);
      const action = (policies[p] === 'basic' ? chooseBasicBotAction : chooseBotAction)(
        view,
        actions.length,
      );
      actions.push(action.key);
      const error = applyAction(s, { key: action.key });
      // applyAction only accepts an opaque key, not a displayed Choice object.
      if (error) throw Error(error);
      consume();
    }
    if (!s.over) throw Error(`Reached ${config.maxActions} decisions without finishing.`);
    result.status = 'complete';
    const max = Math.max(...s.players.map((p) => p.points)),
      winners = s.players.filter((p) => p.points === max).length;
    s.players.forEach((p, i) => {
      result.players[i].points = p.points;
      result.players[i].winShare = p.points === max ? 1 / winners : 0;
    });
  } catch (error) {
    result.error = String(error);
    result.replay = actions;
  }
  result.publishedBooks = s.books.map((b) => b.id);
  result.turns = s.turn;
  result.actions = actions.length;
  return result;
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const ratio = (a: number, b: number) => (b ? a / b : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const col = (key: string, label: string, format?: Column['format']): Column => ({
  key,
  label,
  format,
});
export function summarize(
  config: SimulationConfig,
  games: GameResult[],
  cancelled = false,
): Report {
  const good = games.filter((g) => g.status === 'complete');
  const tables: Table[] = [];
  const base = [col('players', 'Players'), col('name', 'Name')];
  const associations = [
    ...base,
    col('samples', 'Player-games'),
    col('winShare', 'Game win share', 'percent'),
    col('baseline', 'Equal-share baseline', 'percent'),
    col('lift', 'Difference', 'percent'),
    col('points', 'Avg points', 'decimal'),
  ];
  const makeAssociation = (n: number, name: string, ps: PlayerResult[]) => ({
    players: n,
    name,
    samples: ps.length,
    winShare: mean(ps.map((p) => p.winShare)),
    baseline: 1 / n,
    lift: ps.length ? mean(ps.map((p) => p.winShare))! - 1 / n : null,
    points: mean(ps.map((p) => p.points)),
  });
  const overview: Table = {
    title: 'Game pace and player averages',
    description:
      'Completed games only. Turns are actual turns begun (including shoot-the-moon turns), not individual choices. Tied winners split one win equally.',
    columns: [
      col('players', 'Players'),
      col('games', 'Games'),
      col('points', 'Points / player', 'decimal'),
      col('turns', 'Turns / player', 'decimal'),
      col('upgrades', 'Upgrades / player', 'decimal'),
      col('subplots', 'Subplots completed / player', 'decimal'),
      col('characters', 'Characters / player', 'decimal'),
      col('conflicts', 'Conflicts / game', 'decimal'),
      col('moons', 'Moon triggers / game', 'decimal'),
      col('actions', 'Decisions / game', 'decimal'),
    ],
    rows: [],
  };
  const seats: Table = {
    title: 'Seat and bot policy',
    description:
      'Seat 1 acts first. Compare mode rotates one strategic bot through the seats against basic bots; each player count is reported separately.',
    columns: associations,
    rows: [],
  };
  const charTable: Table = {
    title: 'Characters',
    description:
      'Game win share among players who acquired this character, counted once per player-game. Acquisition is not randomized: winning and Subplot rewards can cause ownership. Conflict win rate uses presence at scoring, not causal effect.',
    columns: [
      ...associations,
      col('act', 'Avg acquisition Act', 'decimal'),
      col('activations', 'Activations / owner', 'decimal'),
      col('battles', 'Conflicts present'),
      col('battleWin', 'Conflict win rate', 'percent'),
    ],
    rows: [],
  };
  const subplotTable: Table = {
    title: 'Subplots',
    description:
      'Starting win share uses the randomly dealt starting Subplot. Offers include replacement draws; unfinished offers are censored at game end. Completion association counts each completing player once, even if they complete the same card twice. Elapsed turns are table turns, including other players.',
    columns: [
      ...base,
      col('starts', 'Starting holders'),
      col('startWin', 'Starting game win share', 'percent'),
      col('baseline', 'Equal-share baseline', 'percent'),
      col('offers', 'Offers'),
      col('completions', 'Completions'),
      col('completionRate', 'Completed / offers', 'percent'),
      col('elapsed', 'Turns to complete', 'decimal'),
      col('completers', 'Completing player-games'),
      col('completeWin', 'Completer game win share', 'percent'),
    ],
    rows: [],
  };
  const bookTable: Table = {
    title: 'Book conflicts',
    description:
      'Conflict wins / participant entries is structurally 1 divided by average participants; it is not book strength. Winner game-win share asks whether players who win here also win the game. Each book-winner player-game counts once. Repeat conflicts and coverage are reflected in conflict frequency.',
    columns: [
      ...base,
      col('appearances', 'Games published'),
      col('conflicts', 'Conflicts'),
      col('perAppearance', 'Conflicts / published game', 'decimal'),
      col('participants', 'Participant entries'),
      col('conflictWin', 'Wins / participant entries', 'percent'),
      col('winnerSamples', 'Book-winner player-games'),
      col('winnerWin', 'Winner game win share', 'percent'),
      col('act1', 'Act I conflicts'),
      col('act2', 'Act II conflicts'),
      col('act3', 'Act III conflicts'),
    ],
    rows: [],
  };
  const twistTable: Table = {
    title: 'Twists',
    description:
      'Conflict win rate among player-conflicts in which this Twist was played (deduplicated). Measures bot use, not independent card strength; several cards may contribute to the same win.',
    columns: [
      ...base,
      col('plays', 'Plays'),
      col('battles', 'Player-conflicts played'),
      col('winRate', 'Conflict win rate', 'percent'),
    ],
    rows: [],
  };
  const resources: Table = {
    title: 'Resources and engine building',
    description:
      'Per-player averages across completed games. Upgrade counts are placements, so returned and replayed memories can count again. Erasures exclude conflict cleanup and suspension; memory rewards count the placing player.',
    columns: [
      col('players', 'Players'),
      col('placements', 'Numbered placements', 'decimal'),
      col('overflow', 'Overflow placements', 'decimal'),
      col('foreshadowed', 'Foreshadowed Inklings', 'decimal'),
      col('erasures', 'Ability erasures', 'decimal'),
      col('memory', 'Memory triggers', 'decimal'),
      ...ROWS.map((r) => col(r, `${r} upgrades`, 'decimal')),
    ],
    rows: [],
  };
  const tokensTable: Table = {
    title: 'Conflict tokens acquired',
    description:
      'Initial acquisitions, including shoot-the-moon rewards. Later reactivation of strong sides is not a new acquisition. Ownership association is subject to the same winning-causes-rewards bias.',
    columns: [...associations, col('taken', 'Times acquired')],
    rows: [],
  };
  for (const n of [2, 3, 4]) {
    const gs = good.filter((g) => g.playerCount === n);
    if (!gs.length) continue;
    const ps = gs.flatMap((g) => g.players),
      cs = gs.flatMap((g) => g.conflicts);
    overview.rows.push({
      players: n,
      games: gs.length,
      points: mean(ps.map((p) => p.points)),
      turns: mean(ps.map((p) => p.turns)),
      upgrades: mean(ps.map((p) => p.upgrades)),
      subplots: mean(ps.map((p) => p.subplotsCompleted)),
      characters: mean(ps.map((p) => p.characters.length)),
      conflicts: cs.length / gs.length,
      moons: sum(ps.map((p) => p.moons)) / gs.length,
      actions: mean(gs.map((g) => g.actions)),
    });
    for (let seat = 1; seat <= n; seat++)
      for (const policy of ['strategic', 'basic']) {
        const group = ps.filter((p) => p.seat === seat && p.policy === policy);
        if (group.length) seats.rows.push(makeAssociation(n, `Seat ${seat} · ${policy}`, group));
      }
    for (const c of characters) {
      const group = ps.filter((p) => p.characters.includes(c.id));
      const battles = cs.flatMap((b) =>
        b.characters
          .filter((x) => x.id === c.id)
          .map((x) => ({ winner: b.winner, owner: x.owner })),
      );
      charTable.rows.push({
        ...makeAssociation(n, c.name, group),
        act: mean(group.map((p) => p.characterActs[c.id])),
        activations: mean(group.map((p) => p.activations[c.id] ?? 0)),
        battles: battles.length,
        battleWin: ratio(battles.filter((b) => b.winner === b.owner).length, battles.length),
      });
    }
    for (const sp of subplots) {
      const starts = ps.filter((p) => p.startingSubplot === sp.id),
        offers = gs.flatMap((g) => g.offers.filter((o) => o.id === sp.id)),
        done = offers.filter((o) => o.completed),
        completers = ps.filter((p) => p.completed.includes(sp.id));
      subplotTable.rows.push({
        players: n,
        name: sp.name,
        starts: starts.length,
        startWin: mean(starts.map((p) => p.winShare)),
        baseline: 1 / n,
        offers: offers.length,
        completions: done.length,
        completionRate: ratio(done.length, offers.length),
        elapsed: mean(done.map((o) => o.elapsedTurns!)),
        completers: completers.length,
        completeWin: mean(completers.map((p) => p.winShare)),
      });
    }
    for (const [id, b] of books.entries()) {
      const battles = cs.filter((c) => c.book === id),
        winners = gs.flatMap((g) =>
          [...new Set(g.conflicts.filter((c) => c.book === id).map((c) => c.winner))].map(
            (p) => g.players[p],
          ),
        );
      const appearances = gs.filter((g) => g.publishedBooks.includes(id)).length;
      bookTable.rows.push({
        players: n,
        name: b.title,
        appearances,
        conflicts: battles.length,
        perAppearance: ratio(battles.length, appearances),
        participants: sum(battles.map((c) => c.participants.length)),
        conflictWin: ratio(battles.length, sum(battles.map((c) => c.participants.length))),
        winnerSamples: winners.length,
        winnerWin: mean(winners.map((p) => p.winShare)),
        act1: battles.filter((c) => c.act === 1).length,
        act2: battles.filter((c) => c.act === 2).length,
        act3: battles.filter((c) => c.act === 3).length,
      });
    }
    for (const t of twists) {
      const played = cs.flatMap((c) =>
        [...new Set(c.twists.filter((x) => x.id === t.id).map((x) => x.player))].map(
          (p) => p === c.winner,
        ),
      );
      twistTable.rows.push({
        players: n,
        name: t.name,
        plays: sum(ps.map((p) => p.twists[t.id] ?? 0)),
        battles: played.length,
        winRate: ratio(played.filter(Boolean).length, played.length),
      });
    }
    resources.rows.push({
      players: n,
      placements: mean(ps.map((p) => p.placements)),
      overflow: mean(ps.map((p) => p.overflowPlacements)),
      foreshadowed: mean(ps.map((p) => p.foreshadowed)),
      erasures: mean(ps.map((p) => p.erasures)),
      memory: mean(ps.map((p) => p.memoryRewards)),
      ...Object.fromEntries(ROWS.map((r) => [r, mean(ps.map((p) => p.rows[r] ?? 0))])),
    });
    for (const t of tokens) {
      const owners = ps.filter((p) => (p.tokens[t.id] ?? 0) > 0);
      tokensTable.rows.push({
        ...makeAssociation(n, t.name, owners),
        taken: sum(ps.map((p) => p.tokens[t.id] ?? 0)),
      });
    }
  }
  const policies: Table = {
    title: 'Bot policy totals',
    description:
      'All seats combined within each player count. Compare mode has one strategic player per game, rotating seats; other seats use the original basic policy.',
    columns: associations,
    rows: [],
  };
  for (const n of [2, 3, 4])
    for (const policy of ['strategic', 'basic']) {
      const ps = good
        .filter((g) => g.playerCount === n)
        .flatMap((g) => g.players.filter((p) => p.policy === policy));
      if (ps.length) policies.rows.push(makeAssociation(n, policy, ps));
    }
  tables.push(
    overview,
    policies,
    seats,
    charTable,
    subplotTable,
    bookTable,
    twistTable,
    resources,
    tokensTable,
  );
  tables.push({
    title: 'Point sources',
    description:
      'Total plot points awarded across completed games, grouped by the engine reason; divided by completed games in each player count.',
    columns: [...base, col('points', 'Total points'), col('perGame', 'Points / game', 'decimal')],
    rows: [2, 3, 4].flatMap((n) => {
      const gs = good.filter((g) => g.playerCount === n),
        sources = new Set(gs.flatMap((g) => Object.keys(g.pointSources)));
      return [...sources].sort().map((name) => ({
        players: n,
        name,
        points: sum(gs.map((g) => g.pointSources[name] ?? 0)),
        perGame: sum(gs.map((g) => g.pointSources[name] ?? 0)) / gs.length,
      }));
    }),
  });
  let hash = 2166136261;
  for (const c of JSON.stringify(content)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return {
    config,
    rulesVersion: content.rulesVersion,
    botVersion: BOT_VERSION,
    catalogFingerprint: (hash >>> 0).toString(16),
    attempted: games.length,
    completed: good.length,
    failed: games.length - good.length,
    cancelled,
    tables,
    games,
  };
}
export async function runSimulation(
  input: Partial<SimulationConfig>,
  progress?: (attempted: number, total: number) => void,
  cancelled = () => false,
): Promise<Report> {
  const config = validateConfig(input),
    results: GameResult[] = [];
  for (let i = 0; i < config.games; i++) {
    if (cancelled()) break;
    results.push(simulateGame(config, i));
    if ((i + 1) % 10 === 0 || i + 1 === config.games) {
      progress?.(i + 1, config.games);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return summarize(config, results, results.length < config.games);
}
