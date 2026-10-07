import { placementFulfills } from './subplots';
import {
  books,
  characters,
  twists,
  subplots,
  tokens,
  CONFIG,
  ROWS,
  rowName,
  content,
  movementLimit,
  quillPower,
  type Row,
} from '../data/catalog';
import { makeRng, shuffle, nextInt } from '../kernel/rng';
import {
  bookOf,
  reachable,
  distance,
  pageSide,
  pageNeighbors,
  initialHexes,
  publicationSites,
  adjacentBooks,
} from './topology';
import type {
  GameState,
  Job,
  Choice,
  Action,
  Character,
  Setup,
  Battle,
  Book,
  GameEvent,
} from './types';
export type { GameState, Action, Setup } from './types';
type Option = Choice & { run: (s: GameState) => void };
const job = (type: string, p: number, extra: Partial<Job> = {}): Job => ({ type, p, ...extra });
const queue = (s: GameState, ...jobs: Job[]) => s.jobs.unshift(...jobs);
const note = (s: GameState, t: string) => {
  s.log.push(t);
};
const emit = (s: GameState, event: Omit<GameEvent, 'act' | 'turn'>) => {
  s.events?.push({ act: s.act, turn: s.turn, ...event });
};
export const pageLabel = (s: GameState, page: number) =>
  `${books[s.books[bookOf(page)].id].title} · ${pageSide(page)}`;
export const currentPlayer = (s: GameState) => s.jobs[0]?.p ?? s.active;
const here = (c: Character, b: number) =>
  bookOf(c.page) === b || (c.other !== null && bookOf(c.other) === b);
const ownedChars = (s: GameState, p: number, b?: number) =>
  s.characters.filter((c) => c.owner === p && (b === undefined || here(c, b)));
const count = (s: GameState, p: number, b: number) =>
  s.books[b].slots.filter((x) => x.owner === p).length + s.books[b].overflow[p];
const suppressed = (s: GameState, id: number) =>
  !!s.battle && ((s.battle.allIgnored && id !== 4) || s.battle.ignored.includes(id));
const abilitySuppressed = (s: GameState, id: number) =>
  !!s.battle?.allIgnored &&
  id !== 4 &&
  s.characters.some((c) => c.id === id && here(c, s.battle!.book));
export function power(s: GameState, p: number, b: number) {
  let v =
    count(s, p, b) +
    (bookOf(s.players[p].page) === b ? quillPower(s.players[p].rows.valor, count(s, p, b)) : 0);
  for (const c of ownedChars(s, p, b))
    if (s.battle?.book !== b || !suppressed(s, c.id))
      v += c.id === 1 && c.collected === 3 ? 5 : characters[c.id].power;
  if (s.books[b].id === 2) v += s.books[b].overflow[p];
  if (s.books[b].id === 4) {
    if (bookOf(s.players[p].page) === b) v++;
    v += ownedChars(s, p, b).filter((c) => s.battle?.book !== b || !suppressed(s, c.id)).length;
  }
  return v + (s.battle?.book === b ? s.battle.bonus[p] : 0);
}
export function fullBooks(s: GameState) {
  return s.books.flatMap((b, i) => {
    const empty = b.slots.filter((x) => x.owner === null && !x.neutral).length;
    return empty === 0 || (empty === 1 && s.characters.some((c) => c.id === 5 && here(c, i)))
      ? [i]
      : [];
  });
}
function points(s: GameState, p: number, n: number, why: string) {
  s.players[p].points += n;
  emit(s, {
    type: 'points',
    player: p,
    amount: n,
    source: why,
    book: s.battle ? s.books[s.battle.book].id : undefined,
  });
  note(s, `${s.players[p].name}: ${n >= 0 ? '+' : ''}${n} plot points (${why}).`);
}
function draw(s: GameState, p: number, n: number, kind: 'twist' | 'subplot') {
  for (let i = 0; i < n; i++) {
    if (!s.decks[kind].length) s.decks[kind] = shuffle(s.rng, s.discards[kind].splice(0));
    const id = s.decks[kind].pop();
    if (id === undefined) break;
    if (kind === 'twist') s.players[p].hand.push(id);
    else {
      s.players[p].subplot = id;
      emit(s, { type: 'subplotDraw', player: p, id });
      s.players[p].completing = false;
    }
  }
}
function discard(s: GameState, p: number, id: number) {
  const h = s.players[p].hand;
  h.splice(h.indexOf(id), 1);
  s.discards.twist.push(id);
}
function foreshadow(s: GameState, p: number, n: number) {
  const pl = s.players[p],
    available = s.act < 3 ? pl.reserves[s.act] : 0,
    take = Math.min(n, available);
  if (s.act < 3) pl.reserves[s.act] -= take;
  pl.supply += take;
  if (take) {
    emit(s, { type: 'foreshadow', player: p, amount: take });
    note(s, `${pl.name} foreshadows ${take} Inkling${take > 1 ? 's' : ''}.`);
  }
  if (n > take) points(s, p, n - take, 'reserve unavailable');
}
function gainCharacter(s: GameState, p: number, page = s.players[p].page) {
  const id = s.decks.character.pop();
  if (id === undefined) {
    points(s, p, 2, 'character deck empty');
    return;
  }
  emit(s, { type: 'character', player: p, id });
  s.characters.push({
    id,
    owner: p,
    page,
    other: null,
    used: characters[id].actions.map(() => 0),
    collected: 0,
  });
  note(s, `${s.players[p].name} gains ${characters[id].name}.`);
  if (id === 5) queue(s, job('checkConflict', p, { book: bookOf(page) }));
  if (id === 4) queue(s, job('horse', p));
}
function memoryJobs(p: number, row: Row, b: number): Job[] {
  if (row === 'valor') return [job('points', p, { n: 1, source: 'memory' })];
  if (row === 'insight') return [job('draw', p, { n: 1 })];
  if (row === 'resolve') return [job('foreshadow', p, { n: 1 })];
  return [job('place', p, { n: 1, book: b, mode: 'overflow' })];
}
function suspend(s: GameState, p: number, n = 1) {
  if (s.act < 3) s.players[p].reserves[s.act] += n;
  else s.players[p].out += n;
}
// Receives Inklings already removed from their source; moves grant no placement rewards.
function toOverflow(s: GameState, p: number, b: number, n = 1) {
  if (s.books[b].id === 0) {
    queue(s, job('bindingRedirect', p, { book: b, n, source: 'transfer' }));
  } else s.books[b].overflow[p] += n;
}
function moveFigure(
  s: GameState,
  p: number,
  from: number,
  to: number,
  char?: number,
  other: number | null = null,
) {
  const c = char === undefined ? null : s.characters.find((c) => c.id === char)!;
  const leftOdyssey =
    [from, c?.other].some(
      (page) => page !== null && page !== undefined && s.books[bookOf(page)].id === 3,
    ) && ![to, other].some((page) => page !== null && s.books[bookOf(page)].id === 3);
  if (leftOdyssey) points(s, p, 1, 'leaving The Odyssey');
  if (char === undefined) s.players[p].page = to;
  else {
    c!.page = to;
    c!.other = other;
  }
}
function movePath(s: GameState, from: number, to: number): number[] {
  const paths = [[from]],
    seen = new Set([from]);
  for (const path of paths) {
    const end = path[path.length - 1];
    if (end === to) return path.slice(1);
    for (const next of pageNeighbors(s.books, end))
      if (!seen.has(next)) {
        seen.add(next);
        paths.push([...path, next]);
      }
  }
  return [];
}
function place(s: GameState, p: number, b: number, slot: number | null) {
  const pl = s.players[p];
  if (!pl.supply) return;
  if (slot === null && s.books[b].id === 0) {
    queue(s, job('bindingRedirect', p, { book: b, n: 1, source: 'placement' }));
    return;
  }
  const wasFull = fullBooks(s).includes(b);
  pl.supply--;
  emit(s, {
    type: 'place',
    player: p,
    book: s.books[b].id,
    source: slot === null ? 'overflow' : 'numbered',
  });
  if (slot === null) {
    toOverflow(s, p, b);
  } else {
    const spot = s.books[b].slots[slot];
    spot.owner = p;
    queue(s, job('checkConflict', p, { book: b }));
    if (spot.memory) {
      const m = spot.memory;
      emit(s, { type: 'memoryReward', player: p, row: m.row, book: s.books[b].id });
      queue(s, job('memoryChoice', p, { row: m.row, book: b }));
    }
  }
  if (s.books[b].id === 8) {
    const heads = nextInt(s.rng, 2) === 0;
    points(s, p, heads ? 1 : -1, `Jekyll: ${heads ? 'heads' : 'tails'}`);
  }
  if (s.books[b].id === 1) queue(s, job('bookMove', p));
  const id = pl.subplot;
  if (
    id !== null &&
    !pl.completing &&
    pl.subplotTurn !== s.turn &&
    placementFulfills(s, p, id, {
      book: b,
      slot,
      triggersConflict: !wasFull && fullBooks(s).includes(b) && s.battle?.book !== b,
    })
  ) {
    pl.completing = true;
    pl.subplotTurn = s.turn;
    queue(s, job('subplot', p, { card: id }));
  }
}
function collect(s: GameState, p: number) {
  const c = s.characters.find((c) => c.id === 1 && c.owner === p);
  if (c && c.collected < 3 && !abilitySuppressed(s, 1)) queue(s, job('collect', p));
}
function erase(
  s: GameState,
  p: number,
  b: number,
  slot: number | null,
  actor: number,
  cleanup = false,
) {
  if (slot === null) s.books[b].overflow[p]--;
  else s.books[b].slots[slot].owner = null;
  s.players[p].supply++;
  collect(s, p);
  if (!cleanup) {
    emit(s, { type: 'erase', player: actor, book: s.books[b].id });
  }
}
function upgrade(s: GameState, p: number, b: number, k: number, row: Row) {
  const pl = s.players[p],
    spot = s.books[b].slots[k];
  spot.owner = null;
  spot.memory = { owner: p, row };
  pl.rows[row]++;
  emit(s, { type: 'upgrade', player: p, row, book: s.books[b].id });
  if (!pl.everUpgraded.includes(row)) pl.everUpgraded.push(row);
  if (s.act < 3) pl.reserves[s.act]++;
  else pl.out++;
  note(s, `${pl.name} leaves a ${rowName(row)} memory; the Inkling is suspended.`);
}
function finishAct(s: GameState) {
  s.battle = null;
  s.pendingConflicts = [];
  if (s.act === 3) {
    for (const [p, player] of s.players.entries()) {
      const twistPoints = player.keptTwists.reduce((sum, id) => sum + twists[id].endPoints, 0);
      const subplotPoints = player.completedSubplots.reduce(
        (sum, id) => sum + subplots[id].endPoints,
        0,
      );
      if (twistPoints) points(s, p, twistPoints, 'kept Twists');
      if (subplotPoints) points(s, p, subplotPoints, 'completed Subplots');
    }
    s.over = true;
    s.jobs = [];
    note(s, 'The final Act is complete. End-game card points have been added. Highest total wins.');
    return;
  }
  s.act++;
  for (const b of s.books) {
    b.covered = false;
    b.tokens = [];
  }
  for (const id of s.pools[s.act - 1]) s.tokenStrong[id] = true;
  for (const c of s.characters) {
    s.players[c.owner].supply += c.collected + c.used.reduce((a, b) => a + b, 0);
    c.collected = 0;
    c.used.fill(0);
  }
  for (const p of s.players) {
    p.supply += p.reserves[s.act - 1];
    p.reserves[s.act - 1] = 0;
    p.horseSpent = false;
  }
  note(
    s,
    `Act ${s.act}: conflict tokens reset, character Inklings returned and the reserve released.`,
  );
  s.active = (s.active + 1) % s.players.length;
  s.turn++;
  emit(s, { type: 'turn', player: s.active });
  s.jobs = [];
  for (const c of s.characters) if (c.id === 4) s.jobs.push(job('horse', c.owner));
  s.jobs.push(job('start', s.active));
}
function nextTurn(s: GameState) {
  s.battle = null;
  s.active = (s.active + 1) % s.players.length;
  s.turn++;
  emit(s, { type: 'turn', player: s.active });
  queue(s, job('start', s.active));
}
const firstConflictPoints = [5, 7, 10];
const secondConflictPoints = [2, 3, 4];
const repeatFirstPoints = [3, 4, 5];
const repeatSecondPoints = [2, 2, 2];
const actTokensSpent = (s: GameState) => s.pools[s.act - 1].every((id) => !s.tokenStrong[id]);
function subplotReward(s: GameState, p: number, id: number): Job[] {
  return content.subplotEffects[id].map(
    (effect) =>
      ({
        source: 'Subplot',
        ...effect,
        p,
        ...(effect.type === 'place' ? { book: bookOf(s.players[p].page) } : {}),
        ...(effect.type === 'upgrade' ? { page: s.players[p].page } : {}),
      }) as Job,
  );
}
function battleStart(s: GameState, b: number) {
  const participants = s.players.flatMap((p, i) =>
    count(s, i, b) || ownedChars(s, i, b).length || bookOf(p.page) === b ? [i] : [],
  );
  participants.sort(
    (a, b) =>
      ((a - s.active + s.players.length) % s.players.length) -
      ((b - s.active + s.players.length) % s.players.length),
  );
  s.battle = {
    book: b,
    participants,
    bonus: s.players.map(() => 0),
    played: s.players.map(() => 0),
    ignored: [],
    allIgnored: false,
    hero: [],
    revenge: [],
    tribute: [],
    complete: [],
    cursor: 0,
    slotOwner: null,
    slotPlayed: 0,
    extraUsed: [],
    winner: null,
    cards: [],
  };
  emit(s, {
    type: 'conflictStart',
    player: s.active,
    book: s.books[b].id,
    participants,
    characters: s.characters.filter((c) => here(c, b)).map(({ id, owner }) => ({ id, owner })),
  });
  note(s, `Conflict at ${books[s.books[b].id].title}.`);
  const jobs: Job[] = [];
  for (const c of s.characters)
    if (c.id === 4 && here(c, b) && !s.players[c.owner].horseSpent)
      jobs.push(job('revealHorse', c.owner));
  jobs.push(job('beforeBattle', s.active));
  queue(s, ...jobs);
}
function cardEffect(s: GameState, p: number, id: number) {
  const b = s.battle?.book ?? bookOf(s.players[p].page),
    battle = s.battle;
  if (id < 8 && battle) {
    let amount = CONFIG.twistPower[id];
    if (id === 0 && ownedChars(s, p, b).length) amount += CONFIG.heroCharacterBonus;
    if (id === 2 && count(s, p, b) === 1) amount = CONFIG.travellingSoloPower;
    battle.bonus[p] += amount;
    if (id === 3) queue(s, job('transfer', p, { book: b, n: 2 }));
    if (id === 4) queue(s, job('ignore', p, { book: b }));
    if (id === 5) queue(s, job('erase', p, { book: b, n: 2, mode: 'own', source: 'experiment' }));
    if (id === 6) battle.revenge.push(p);
    if (id === 7) battle.hero.push(p);
  } else if (id === 8) {
    battle!.bonus[p] += 2;
    queue(s, job('move', p, { mode: 'any', book: b, source: 'twist' }));
  } else if (id === 9) queue(s, job('transfer', p, { book: b, n: 3 }));
  else if (id === 10) {
    queue(s, job('place', p, { book: b, mode: 'overflow', n: 2 }));
    foreshadow(s, p, 2);
  } else if (id === 11) {
    battle!.bonus[p] += 3;
    queue(s, job('upgrade', p, { book: b, source: 'bonus' }));
  } else if (id === 12)
    queue(
      s,
      job('returnMemory', p, { book: b, page: b * 2 + s.books[b].slots[battle!.cursor].page }),
    );
  else if (id === 13)
    queue(s, job('erase', p, { book: b, n: 1, mode: 'opponent', source: 'replace' }));
  else if (id === 14) {
    battle!.bonus[p] += 3;
    queue(s, job('refresh', p, { n: 2 }));
  }
}
function playTwist(s: GameState, p: number, id: number) {
  const bt = s.battle;
  if (!bt) throw Error('Twists can only be played during a conflict space check.');
  s.players[p].hand.splice(s.players[p].hand.indexOf(id), 1);
  s.players[p].keptTwists.push(id);
  emit(s, { type: 'twist', player: p, id, book: s.books[bt.book].id });
  bt.played[p]++;
  bt.slotPlayed++;
  if (bt.slotPlayed === 2) bt.extraUsed.push(p);
  note(s, `${s.players[p].name} plays ${twists[id].name}.`);
  if (ownedChars(s, p, bt.book).some((c) => c.id === 6) && !abilitySuppressed(s, 6))
    draw(s, p, 1, 'twist');
  cardEffect(s, p, id);
}
function charAction(s: GameState, p: number, c: Character, a: number, spendInk = true) {
  if (spendInk) c.used[a]++;
  emit(s, { type: 'activate', player: p, id: c.id });
  if (spendInk) s.players[p].supply--;
  note(s, `${s.players[p].name} activates ${characters[c.id].name}.`);
  const move = (n: number, mode?: string) =>
    job('move', p, { char: c.id, n, mode, source: 'character' });
  if (c.id === 0) queue(s, move(1), job('charErase', p, { char: c.id, source: 'replace' }));
  if (c.id === 2) {
    const heads = nextInt(s.rng, 2) === 0;
    note(s, `Jekyll flips ${heads ? 'heads' : 'tails'}.`);
    queue(
      s,
      ...(heads
        ? [move(1), job('charOverflow', p, { char: c.id, n: 2 })]
        : [job('charErase', p, { char: c.id })]),
    );
  }
  if (c.id === 3) queue(s, a === 0 ? move(1) : job('charErase', p, { char: c.id }));
  if (c.id === 4 || c.id === 5) queue(s, move(2));
  if (c.id === 6) queue(s, move(3));
  if (c.id === 7) queue(s, move(18, 'any'));
  if (c.id === 8) queue(s, move(18, 'any'), job('move', p, { mode: 'any', source: 'character' }));
  if (c.id === 9) queue(s, job('bridge', p, { char: c.id }));
}
function options(s: GameState): Option[] {
  const j = s.jobs[0];
  if (!j || s.over) return [];
  const p = j.p,
    pl = s.players[p],
    opts: Option[] = [];
  const add = (
    key: string,
    label: string,
    run: (s: GameState) => void,
    group = j.type,
    extra: Partial<Choice> = {},
  ) => opts.push({ key, label, group, ...extra, run });
  const done = (state: GameState) => {
    state.jobs.shift();
  };
  const pass = () => add('skip', 'Skip this optional effect', done);
  if (j.type === 'setup' || j.type === 'move') {
    const c = j.char === undefined ? null : s.characters.find((c) => c.id === j.char)!;
    const from = c ? c.page : pl.page;
    const pages =
      j.type === 'setup' || j.mode === 'any'
        ? Array.from({ length: s.books.length * 2 }, (_, i) => i)
        : reachable(s.books, from, j.n ?? movementLimit(pl.rows.curiosity));
    for (const page of pages.filter(
      (page) =>
        (j.book === undefined || bookOf(page) === j.book) &&
        (j.source !== 'normal' || page !== (j.origin ?? from)),
    ))
      add(
        `page:${page}`,
        page === from && j.type !== 'setup' ? `Stay · ${pageLabel(s, page)}` : pageLabel(s, page),
        (s) => {
          done(s);
          if (j.type === 'setup') s.players[p].page = page;
          else {
            let previous = from;
            for (const step of j.mode === 'any' ? [page] : movePath(s, from, page)) {
              moveFigure(s, p, previous, step, c?.id);
              previous = step;
            }
          }
          if (c?.id === 5) queue(s, job('checkConflict', p, { book: bookOf(page) }));
        },
        'Move',
        { page },
      );
  }
  if (j.type === 'move') {
    const c = j.char === undefined ? null : s.characters.find((c) => c.id === j.char)!;
    const from = c ? c.page : pl.page;
    const remaining = j.n ?? movementLimit(pl.rows.curiosity);
    if (j.source !== 'normal' || from !== (j.origin ?? from))
      add(
        'endMove',
        'End move',
        (state) => {
          done(state);
        },
        'Move',
      );
    if (j.mode !== 'any' && remaining > 0)
      for (const page of pageNeighbors(s.books, from).filter(
        (page) => !(j.source === 'normal' && remaining === 1 && page === (j.origin ?? from)),
      ))
        add(
          `step:${page}`,
          `Step to ${pageLabel(s, page)}`,
          (state) => {
            const pending = state.jobs[0];
            pending.n = remaining - 1;
            pending.origin = j.origin ?? from;
            moveFigure(state, p, from, page, c?.id);
            if (c?.id === 5) queue(state, job('checkConflict', p, { book: bookOf(page) }));
          },
          'Step',
          { page },
        );
  }
  if (j.type === 'bookMove') {
    for (const id of [undefined, ...ownedChars(s, p).map((c) => c.id)])
      add(
        `bookMove:${id ?? 'Quill'}`,
        `Move ${id === undefined ? 'your Quill' : characters[id].name} up to 1 page`,
        (state) => {
          done(state);
          queue(state, job('move', p, { n: 1, char: id, source: 'book' }));
        },
      );
    pass();
  }
  if (j.type === 'publish') {
    const id = s.unpublished[0];
    if (id !== undefined)
      for (const site of publicationSites(s.books))
        add(
          `publish:${site.q}:${site.r}`,
          `Publish ${books[id].title} at ${site.q}, ${site.r}`,
          (state) => {
            done(state);
            state.unpublished.shift();
            state.books.push(makeBook(id, site.q, site.r, state.players.length));
            note(state, `${pl.name} publishes ${books[id].title}.`);
            queue(state, job('publishOverflow', p, { book: state.books.length - 1 }));
          },
          'Publish',
          {
            ...site,
            detail:
              'Touches at least two books. Then place an Inkling in a neighboring binding space.',
          },
        );
  }
  if (j.type === 'publishOverflow' && pl.supply)
    s.books.forEach((b, bi) => {
      if (adjacentBooks(s.books[j.book!], b))
        add(
          `publishOverflow:${bi}`,
          `Binding space at ${books[b.id].title}`,
          (state) => {
            done(state);
            place(state, p, bi, null);
          },
          'Publication bonus',
          { book: bi },
        );
    });
  if (j.type === 'turn') {
    if (!s.acted && pl.supply)
      add(
        'place',
        'Choose Resolve placement',
        (state) => {
          state.acted = true;
          queue(state, job('resolveChoice', p, { page: pl.page }));
        },
        'Resolve',
      );
    if (!s.acted) {
      const pj = job('place', p, {
        page: pl.page,
        n: 1,
        optional: true,
      });
      if (pl.supply)
        for (const option of options({ ...s, jobs: [pj] }).filter((a) =>
          a.key.startsWith('place:'),
        )) {
          add(
            option.key.replace('place:', 'placeHere:'),
            option.label,
            (state) => {
              state.acted = true;
              state.jobs.unshift({ ...pj });
              option.run(state);
            },
            'Place',
            { book: bookOf(pl.page), page: pl.page },
          );
        }
    }
    if (s.acted)
      for (const option of upgradeOptions(s, job('upgrade', p, { page: pl.page })))
        add(
          `turn:${option.key}`,
          `Leave ${option.label}`,
          (state) => {
            state.jobs.shift();
            const [, book, slot, row] = option.key.split(':');
            upgrade(state, p, Number(book), Number(slot), row as Row);
            queue(state, job('resolve', p));
          },
          'Memory',
          { book: option.book, detail: option.detail },
        );
    if (s.acted)
      add(
        'finish',
        'End turn',
        (s) => {
          done(s);
          queue(s, job('resolve', p));
        },
        'Finish',
      );
    else if (!pl.supply)
      add(
        'finish',
        'No Inklings available · end turn',
        (s) => {
          done(s);
          queue(s, job('resolve', p));
        },
        'Finish',
      );
  }
  if (j.type === 'bindingRedirect') {
    s.books.forEach((b, book) => {
      if (!adjacentBooks(s.books[j.book!], b)) return;
      add(
        `bindingRedirect:${book}`,
        `Binding space at ${books[b.id].title}`,
        (state) => {
          done(state);
          if (j.source === 'placement') place(state, p, book, null);
          else toOverflow(state, p, book, j.n ?? 1);
        },
        'Submarine redirect',
        { book },
      );
    });
  }
  if (j.type === 'memoryChoice') {
    add(
      'memoryBonus',
      `Gain the ${rowName(j.row!)} memory bonus`,
      (state) => {
        done(state);
        queue(state, ...memoryJobs(p, j.row!, j.book!));
      },
      'Memory',
    );
    for (const c of ownedChars(s, p))
      characters[c.id].actions.forEach(([max, text], a) => {
        if (c.used[a] < max)
          add(
            `memoryActivate:${c.id}:${a}`,
            `Use ${characters[c.id].name}`,
            (state) => {
              done(state);
              charAction(state, p, state.characters.find((x) => x.id === c.id)!, a, false);
            },
            'Character action',
            { detail: text },
          );
      });
  }
  if (j.type === 'forcedConflict') {
    if (!s.books.some((_, b) => count(s, p, b)))
      add(
        'forcedConflict:none',
        'No Inklings on books · end turn',
        (state) => {
          done(state);
          queue(state, job('end', p));
        },
        'No Inkling turn',
      );
    s.books.forEach((b, book) => {
      if (!count(s, p, book)) return;
      add(
        `forcedConflict:${book}`,
        `Start conflict · ${books[b.id].title}`,
        (state) => {
          done(state);
          battleStart(state, book);
        },
        'No Inkling turn',
        { book },
      );
    });
  }
  if (j.type === 'insightDraw') {
    if (pl.hand.length + (pl.subplot === null ? 0 : 1) < 4) {
      if (s.decks.twist.length || s.discards.twist.length)
        add(
          'insightTwist',
          'Draw 1 Twist',
          (state) => {
            draw(state, p, 1, 'twist');
          },
          'Insight',
        );
      if (pl.subplot === null && (s.decks.subplot.length || s.discards.subplot.length))
        add(
          'insightSubplot',
          'Draw 1 Subplot',
          (state) => {
            draw(state, p, 1, 'subplot');
          },
          'Insight',
        );
    }
    pass();
  }
  if (j.type === 'resolveChoice') {
    const labels = [content.tracks[3][2], ...content.tracks[3][3]] as string[];
    for (let level = 0; level <= pl.rows.resolve; level++)
      add(
        `resolveOption:${level}`,
        labels[level],
        (state) => {
          done(state);
          const page = j.page ?? pl.page;
          if (level === 0) queue(state, job('place', p, { page, n: 1 }));
          if (level === 1)
            queue(state, job('place', p, { book: bookOf(page), mode: 'overflow', n: 2 }));
          if (level === 2)
            queue(
              state,
              job('place', p, { page, n: 1 }),
              job('place', p, { book: bookOf(page), mode: 'overflow', n: 1 }),
            );
          if (level === 3) queue(state, job('placeAdjacent', p, { page, n: 3, optional: true }));
        },
        'Resolve',
      );
  }
  if (j.type === 'placeAdjacent') {
    const origin = j.page ?? pl.page;
    for (const page of [origin, ...pageNeighbors(s.books, origin)]) {
      const single = job('place', p, { page, n: 1 });
      for (const option of options({ ...s, jobs: [single] }))
        add(
          `adjacent:${page}:${option.key}`,
          option.label,
          (state) => {
            done(state);
            if ((j.n ?? 1) > 1) queue(state, { ...j, n: (j.n ?? 1) - 1 });
            state.jobs.unshift(single);
            option.run(state);
          },
          'Place',
          { page, book: bookOf(page) },
        );
    }
    if ((j.n ?? 3) < 3 || !pl.supply) pass();
  }
  if (j.type === 'place') {
    const b = j.book ?? bookOf(j.page ?? pl.page),
      page = j.page ?? pl.page;
    const spots = s.books[b].slots.flatMap((spot, i) =>
      spot.page === page % 2 && spot.owner === null && !spot.neutral ? [i] : [],
    );
    const addPlace = (k: number | null) =>
      add(
        `place:${k}`,
        k === null
          ? `Place in binding space · ${books[s.books[b].id].title}`
          : `Place in page space ${k + 1} · ${pageLabel(s, page)}`,
        (s) => {
          done(s);
          if ((j.n ?? 1) > 1) queue(s, { ...j, n: (j.n ?? 1) - 1 });
          place(s, p, b, k);
        },
        'Place',
        { book: b, page },
      );
    if (pl.supply) {
      if (j.mode === 'overflow' || !spots.length) addPlace(null);
      else spots.forEach(addPlace);
    }
    if (j.optional) pass();
  }
  if (j.type === 'upgrade') return upgradeOptions(s, j);
  if (j.type === 'returnMemory')
    s.books[j.book!].slots.forEach((spot, k) => {
      if (spot.memory?.owner === p)
        add(
          `memory:${k}`,
          `Return ${rowName(spot.memory.row)} memory from space ${k + 1}`,
          (s) => {
            done(s);
            const sp = s.books[j.book!].slots[k];
            s.players[p].rows[sp.memory!.row]--;
            sp.memory = null;
            gainCharacter(s, p, j.page);
          },
          'Return memory',
          { book: j.book },
        );
    });
  if (j.type === 'collect') {
    add('collect', 'Collect this erased Inkling on Frankenstein', (s) => {
      done(s);
      const c = s.characters.find((c) => c.id === 1 && c.owner === p)!;
      c.collected++;
      s.players[p].supply--;
    });
    pass();
  }
  if (j.type === 'optionalForeshadow') {
    add('foreshadow', 'Foreshadow 1 Inkling', (s) => {
      done(s);
      foreshadow(s, p, 1);
    });
    pass();
  }
  if (j.type === 'horse')
    for (let i = 0; i < content.horse.length; i++)
      add(
        `horse:${i}`,
        content.horse[i][0],
        (s) => {
          done(s);
          s.players[p].horse = i;
          s.players[p].horseSpent = false;
        },
        'Hidden power',
        { detail: content.horse[i][1] },
      );
  if (j.type === 'bridge')
    for (let a = 0; a < s.books.length * 2; a++)
      for (let b = a + 1; b < s.books.length * 2; b++)
        if (bookOf(a) !== bookOf(b) && distance(s.books, a, b) === 1)
          add(`bridge:${a}:${b}`, `${pageLabel(s, a)} ↔ ${pageLabel(s, b)}`, (s) => {
            done(s);
            const c = s.characters.find((c) => c.id === j.char)!;
            const from = c.page;
            moveFigure(s, p, from, a, c.id, b);
            c.other = b;
          });
  if (j.type === 'refresh')
    for (const c of ownedChars(s, p))
      c.used.forEach((n, a) => {
        if (n)
          add(
            `refresh:${c.id}:${a}`,
            `Return 1 activation Inkling from ${characters[c.id].name}`,
            (s) => {
              done(s);
              s.characters.find((x) => x.id === c.id)!.used[a]--;
              s.players[p].supply++;
              if (j.n! > 1) queue(s, { ...j, n: j.n! - 1 });
            },
          );
      });
  if (j.type === 'refresh') pass();
  if (j.type === 'erase' || j.type === 'transfer') {
    s.books.forEach((book, b) => {
      if (j.type === 'transfer' && b === j.book) return;
      if (j.type === 'erase' && j.book !== undefined && b !== j.book) return;
      if (j.type === 'erase' && j.page !== undefined && b !== bookOf(j.page)) return;
      if (j.mode === 'otherBook' && b === j.target) return;
      const eligible = (owner: number) =>
        j.mode === 'any' || (j.type === 'transfer' || j.mode === 'own' ? owner === p : owner !== p);
      const target = (owner: number, k: number | null) =>
        add(
          `target:${b}:${k}:${owner}`,
          `${s.players[owner].name}'s Inkling · ${books[book.id].title} · ${k === null ? 'overflow' : 'space ' + (k + 1)}`,
          (s) => {
            done(s);
            if (j.n! > 1) queue(s, { ...j, n: j.n! - 1 });
            if (j.type === 'transfer') {
              if (k === null) s.books[b].overflow[owner]--;
              else s.books[b].slots[k].owner = null;
              toOverflow(s, p, j.book!);
            } else {
              erase(s, owner, b, k, p);
              if (j.source === 'experiment') s.battle!.bonus[p] += CONFIG.experimentPerErased;
              if (j.source === 'replace') place(s, p, b, k);
            }
          },
          j.type === 'transfer' ? 'Move Inkling' : 'Erase',
          { book: b },
        );
      book.slots.forEach((spot, k) => {
        if (
          spot.owner !== null &&
          eligible(spot.owner) &&
          (j.page === undefined || spot.page === j.page % 2)
        )
          target(spot.owner, k);
      });
      book.overflow.forEach((n, owner) => {
        if (n && eligible(owner)) target(owner, null);
      });
    });
    pass();
  }
  if (j.type === 'ignore')
    for (const c of s.characters.filter((c) => c.owner !== p && here(c, j.book!)))
      add(`ignore:${c.id}`, `Ignore ${characters[c.id].name}'s power`, (s) => {
        done(s);
        s.battle!.ignored.push(c.id);
      });
  if (j.type === 'discard' || j.type === 'cycle') {
    if (j.type === 'discard' && pl.subplot !== null)
      add('discardSubplot', `Discard Subplot: ${subplots[pl.subplot].name}`, (state) => {
        done(state);
        state.discards.subplot.push(state.players[p].subplot!);
        state.players[p].subplot = null;
        state.players[p].completing = false;
      });
    for (const card of pl.hand)
      add(`discard:${card}`, `Discard ${twists[card].name}`, (s) => {
        done(s);
        discard(s, p, card);
        if (j.type === 'cycle') draw(s, p, 1, 'twist');
      });
    if (j.type === 'cycle') pass();
  }
  if (j.type === 'subplot') {
    const close = (s: GameState) => {
      done(s);
      emit(s, { type: 'subplotComplete', player: p, id: j.card! });
      s.players[p].completedSubplots.push(j.card!);
      s.players[p].subplot = null;
      note(s, `${s.players[p].name} completes ${subplots[j.card!].name}.`);
    };
    add(
      'character',
      'Complete Subplot · draw a character',
      (s) => {
        close(s);
        queue(s, job('newsubplot', p));
        gainCharacter(s, p);
      },
      'Reward',
    );
    add(
      'alternative',
      `Complete Subplot · ${subplots[j.card!].reward}`,
      (s) => {
        close(s);
        queue(s, ...subplotReward(s, p, j.card!), job('newsubplot', p));
      },
      'Reward',
    );
  }
  if (j.type === 'resolve')
    for (const b of fullBooks(s))
      add(
        `conflict:${b}`,
        `Resolve ${books[s.books[b].id].title}`,
        (s) => {
          done(s);
          queue(s, job('resolve', p));
          battleStart(s, b);
        },
        'Conflict',
        { book: b },
      );
  if (j.type === 'battle') {
    const bt = s.battle!,
      actor = bt.slotOwner;
    if (actor === null) return opts;
    const hand = s.players[actor].hand;
    if (bt.slotPlayed < battleLimit(s, actor))
      for (const card of hand) {
        if (card === 12 && !s.books[bt.book].slots.some((x) => x.memory?.owner === actor)) continue;
        add(
          `twist:${card}`,
          twists[card].name,
          (state) => playTwist(state, actor, card),
          'Conflict Twist',
          { detail: twists[card].text },
        );
      }
    add('pass', 'Pass this space', (state) => advanceBattleSlot(state.battle!), 'Conflict');
  }
  if (j.type === 'nemo') {
    const c = s.characters.find((c) => c.id === 7)!;
    for (let n = 1; n <= c.used[0]; n++)
      add(`nemo:${n}`, `Move ${n} activation Inkling${n > 1 ? 's' : ''} into overflow`, (s) => {
        done(s);
        s.characters.find((c) => c.id === 7)!.used[0] -= n;
        toOverflow(s, p, j.book!, n);
      });
    pass();
  }
  if (j.type === 'takeToken')
    for (const id of s.pools[s.act - 1])
      add(
        `token:${id}`,
        `${tokens[id].name} · ${s.tokenStrong[id] ? tokens[id].text : tokens[id].back}`,
        (s) => {
          done(s);
          emit(s, { type: 'token', player: p, id, source: 'conflict' });
          const strong = s.tokenStrong[id];
          s.tokenStrong[id] = false;
          const ranked =
            s.battle!.ranking ??
            [...s.battle!.participants].sort((a, b) => {
              const powerDiff = power(s, b, s.battle!.book) - power(s, a, s.battle!.book);
              if (powerDiff) return powerDiff;
              const leftmost = (player: number) => {
                const slots = s.books[s.battle!.book].slots;
                const found = slots.findIndex((slot) => slot.owner === player);
                return found < 0 ? Number.MAX_SAFE_INTEGER : found;
              };
              return leftmost(a) - leftmost(b);
            });
          const first = strong ? firstConflictPoints[s.act - 1] : repeatFirstPoints[s.act - 1];
          const second = strong ? secondConflictPoints[s.act - 1] : repeatSecondPoints[s.act - 1];
          points(s, ranked[0], first, `${strong ? 'front' : 'back'} conflict token`);
          if (ranked[1] !== undefined)
            points(s, ranked[1], second, `${strong ? 'front' : 'back'} conflict token`);
          queue(s, ...(strong ? [job('publish', p)] : []), job('afterRewards', p));
        },
        'Conflict reward',
        { detail: s.tokenStrong[id] ? tokens[id].text : tokens[id].back },
      );
  return opts;
}
function upgradeOptions(s: GameState, j: Job): Option[] {
  const opts: Option[] = [],
    p = j.p;
  s.books.forEach((b, i) =>
    b.slots.forEach((spot, k) => {
      if (
        spot.owner !== p ||
        spot.memory ||
        (j.book !== undefined && j.book !== i) ||
        (j.page !== undefined && (bookOf(j.page) !== i || spot.page !== j.page % 2))
      )
        return;
      for (const row of ROWS)
        if (s.players[p].rows[row] < CONFIG.memories)
          opts.push({
            key: `upgrade:${i}:${k}:${row}`,
            label: `${rowName(row)} memory · space ${k + 1} · ${books[b.id].title}`,
            group: 'Memory',
            book: i,
            detail: String(content.tracks[ROWS.indexOf(row)][4]),
            run: (s) => {
              s.jobs.shift();
              upgrade(s, p, i, k, row);
            },
          });
    }),
  );
  return opts;
}
function advanceBattleSlot(bt: Battle) {
  bt.cursor++;
  bt.slotOwner = null;
  bt.slotPlayed = 0;
}
function battleLimit(s: GameState, p: number) {
  const bt = s.battle!;
  const extra =
    ownedChars(s, p, bt.book).some((c) => c.id === 5 && !abilitySuppressed(s, 5)) ||
    bt.tribute.includes(-p - 1);
  return extra && !bt.extraUsed.includes(p) ? 2 : 1;
}
function pump(s: GameState) {
  for (let guard = 0; guard < 1000 && !s.over; guard++) {
    const j = s.jobs[0];
    if (!j) throw Error('No pending job');
    const p = j.p,
      pl = s.players[p];
    if (j.type === 'checkConflict') {
      s.jobs.shift();
      if (fullBooks(s).includes(j.book!)) {
        if (s.battle) {
          if (s.battle.book !== j.book && !s.pendingConflicts.includes(j.book!))
            s.pendingConflicts.push(j.book!);
        } else battleStart(s, j.book!);
      }
      continue;
    }
    if (j.type === 'newsubplot') {
      s.jobs.shift();
      draw(s, p, 1, 'subplot');
      continue;
    }
    if (j.type === 'start') {
      if (
        s.players.every(
          (pl, owner) => pl.supply === 0 && !s.books.some((_, b) => count(s, owner, b)),
        )
      ) {
        note(s, 'No player has usable Inklings; end the Act and release the next reserve.');
        finishAct(s);
        continue;
      }
      const waiting = fullBooks(s);
      if (waiting.length) {
        battleStart(s, waiting[0]);
        continue;
      }
      s.jobs.shift();
      s.acted = false;
      if (!pl.supply) {
        note(s, `${pl.name} has no Inklings and must choose one of their books for conflict.`);
        queue(s, job('forcedConflict', p));
      } else queue(s, job('move', p, { source: 'normal', origin: pl.page }), job('turn', p));
      continue;
    }
    if (j.type === 'gain' || j.type === 'points' || j.type === 'draw' || j.type === 'foreshadow') {
      s.jobs.shift();
      if (j.type === 'gain') gainCharacter(s, p);
      if (j.type === 'points') points(s, p, j.n!, j.source ?? 'bonus');
      if (j.type === 'draw') draw(s, p, j.n!, 'twist');
      if (j.type === 'foreshadow') foreshadow(s, p, j.n!);
      continue;
    }
    if (j.type === 'charErase' || j.type === 'charOverflow') {
      s.jobs.shift();
      const c = s.characters.find((c) => c.id === j.char)!;
      queue(
        s,
        j.type === 'charErase'
          ? job('erase', p, { page: c.page, n: 1, mode: 'opponent', source: j.source })
          : job('place', p, { book: bookOf(c.page), mode: 'overflow', n: j.n, optional: true }),
      );
      continue;
    }
    if (j.type === 'resolve' && !fullBooks(s).length) {
      s.jobs.shift();
      queue(s, job('end', p));
      continue;
    }
    if (j.type === 'end') {
      s.jobs.shift();
      const c = ownedChars(s, p).find((c) => c.id === 1 && c.collected === 3);
      queue(
        s,
        ...(c ? [job('move', p, { char: 1, n: 1, source: 'character' })] : []),
        job('draw', p, { n: pl.rows.insight + 1 }),
        job('next', p),
      );
      continue;
    }
    if (j.type === 'next') {
      s.jobs.shift();
      nextTurn(s);
      continue;
    }
    if (j.type === 'revealHorse') {
      s.jobs.shift();
      const id = pl.horse;
      pl.horseSpent = true;
      note(s, `Trojan Horse reveals ${content.horse[id ?? 0][0]}.`);
      if (id === 0)
        queue(s, job('place', p, { book: s.battle!.book, mode: 'overflow', n: 3, optional: true }));
      if (id === 1) s.battle!.tribute.push(-p - 1);
      if (id === 2) s.battle!.tribute.push(p);
      if (id === 3) s.battle!.complete.push(p);
      if (id === 4) s.battle!.allIgnored = true;
      continue;
    }
    if (j.type === 'beforeBattle') {
      s.jobs.shift();
      const bt = s.battle!,
        id = s.books[bt.book].id,
        js: Job[] = [];
      const castleOwner = s.books[bt.book].slots[0].owner;
      if (id === 6 && castleOwner !== null)
        js.push(job('erase', castleOwner, { book: bt.book, mode: 'any', n: 1, source: 'castle' }));
      for (const c of s.characters)
        if (c.id === 7 && here(c, bt.book) && !abilitySuppressed(s, 7))
          js.push(job('nemo', c.owner, { book: bt.book }));
      queue(s, ...js, job('battle', bt.participants[0]));
      continue;
    }
    if (j.type === 'battle') {
      const bt = s.battle!;
      const slots = s.books[bt.book].slots;
      if (bt.cursor < slots.length) {
        if (bt.slotOwner === null) {
          if (slots[bt.cursor].owner === null) {
            advanceBattleSlot(bt);
            continue;
          }
          bt.slotOwner = slots[bt.cursor].owner;
        }
        if (bt.slotPlayed >= battleLimit(s, bt.slotOwner!)) {
          advanceBattleSlot(bt);
          continue;
        }
        s.jobs[0].p = bt.slotOwner!;
      }
      if (bt.cursor >= slots.length) {
        s.jobs.shift();
        const leftmost = (player: number) => {
          const found = slots.findIndex((slot) => slot.owner === player);
          return found < 0 ? Number.MAX_SAFE_INTEGER : found;
        };
        bt.ranking = [...bt.participants].sort(
          (a, b) => power(s, b, bt.book) - power(s, a, bt.book) || leftmost(a) - leftmost(b),
        );
        const winner = bt.ranking[0];
        bt.winner = winner;
        emit(s, {
          type: 'conflictEnd',
          player: winner,
          book: s.books[bt.book].id,
          participants: [...bt.participants],
          characters: s.characters
            .filter((c) => here(c, bt.book))
            .map(({ id, owner }) => ({ id, owner })),
        });
        note(s, `${s.players[winner].name} wins with ${power(s, winner, bt.book)} power.`);
        const js: Job[] = [];
        for (const p of bt.hero)
          if (p === winner) js.push(job('points', p, { n: 2, source: 'A Lasting Legend' }));
        for (const p of bt.tribute)
          if (p === winner) js.push(job('points', p, { n: 4, source: 'Tribute to the Gods' }));
        for (const p of bt.complete)
          if (
            p === winner &&
            s.players[p].subplot !== null &&
            !s.players[p].completing &&
            s.players[p].subplotTurn !== s.turn
          ) {
            s.players[p].completing = true;
            s.players[p].subplotTurn = s.turn;
            js.push(job('subplot', p, { card: s.players[p].subplot! }));
          }
        for (const p of bt.revenge) if (p !== winner) js.push(job('revenge', p, { book: bt.book }));
        queue(s, ...js, job('cleanup', winner, { book: bt.book }), job('takeToken', winner));
        continue;
      }
    }
    if (j.type === 'revenge') {
      s.jobs.shift();
      queue(s, job('erase', p, { n: 1, mode: 'otherBook', target: j.book }));
      continue;
    }
    if (j.type === 'cleanup') {
      s.jobs.shift();
      const b = s.books[j.book!];
      b.overflow.forEach((n, owner) => {
        if (b.id === 5) {
          b.overflow[owner] = 0;
          suspend(s, owner, n);
        } else for (let i = 0; i < n; i++) erase(s, owner, j.book!, null, p, true);
      });
      b.slots.forEach((spot, k) => {
        if (spot.owner === null) return;
        if (b.id === 7) {
          b.overflow[spot.owner]++;
          spot.owner = null;
        } else if (b.id === 5) {
          suspend(s, spot.owner);
          spot.owner = null;
        } else erase(s, spot.owner, j.book!, k, p, true);
      });
      continue;
    }
    if (j.type === 'afterRewards') {
      s.jobs.shift();
      s.battle = null;
      queue(s, ...s.pendingConflicts.splice(0).map((book) => job('checkConflict', p, { book })));
      if (actTokensSpent(s)) {
        const owner = s.active,
          c = ownedChars(s, owner).find((c) => c.id === 1 && c.collected === 3);
        s.jobs = [];
        queue(
          s,
          ...(c ? [job('move', owner, { char: 1, n: 1, source: 'character' })] : []),
          job('draw', owner, { n: s.players[owner].rows.insight + 1 }),
          job('advanceAct', owner),
        );
      }
      if (!s.jobs.length) queue(s, job('end', s.active));
      continue;
    }
    if (j.type === 'advanceAct') {
      finishAct(s);
      continue;
    }
    if (j.type === 'collect') {
      const c = s.characters.find((c) => c.id === 1 && c.owner === p);
      if (!c || c.collected >= 3 || !pl.supply) {
        s.jobs.shift();
        continue;
      }
    }
    if (options(s).length) return;
    s.jobs.shift();
    if (j.type === 'upgrade' && j.source === 'bonus') points(s, p, 2, 'no legal extra upgrade');
  }
  if (!s.over) throw Error('Effect loop exceeded safe limit');
}
export function legalActions(s: GameState): Choice[] {
  return options(s).map(({ run, ...a }) => a);
}
export function applyAction(s: GameState, action: Action): string | null {
  if (!action || typeof action.key !== 'string' || Object.keys(action).some((k) => k !== 'key'))
    return 'Invalid action';
  const next = structuredClone(s),
    opt = options(next).find((a) => a.key === action.key);
  if (!opt) return 'Action is not legal now';
  try {
    opt.run(next);
    pump(next);
    assertInvariants(next);
    Object.assign(s, next);
    return null;
  } catch (e) {
    return String(e);
  }
}
function makeBook(id: number, q: number, r: number, players: number): Book {
  return {
    id,
    q,
    r,
    slots: books[id].page_slots.flatMap((n, side) =>
      Array.from({ length: n }, () => ({ page: side, owner: null, memory: null, neutral: false })),
    ),
    overflow: Array(players).fill(0),
    covered: false,
    tokens: [],
  };
}
export function newGame(setup: Setup, recordEvents = false): GameState {
  if (
    !Array.isArray(setup.names) ||
    setup.names.length < 2 ||
    setup.names.length > 4 ||
    setup.names.some((n) => typeof n !== 'string' || !n.trim() || n.length > 40) ||
    !Number.isInteger(setup.seed) ||
    (setup.controllers !== undefined &&
      (setup.controllers.length !== setup.names.length ||
        setup.controllers.some((c) => c !== 'human' && c !== 'bot')))
  )
    throw Error('Use 2–4 named players and an integer seed.');
  const rng = makeRng(setup.seed),
    ids = shuffle(
      rng,
      books.map((_, i) => i),
    );
  const s: GameState = {
    schema: 1,
    version: content.rulesVersion,
    seed: setup.seed,
    rng,
    players: setup.names.map((name, i) => ({
      controller: setup.controllers?.[i] ?? 'human',
      name,
      supply: CONFIG.supply,
      reserves: [0, CONFIG.reserve, CONFIG.reserve],
      out: 0,
      points: 0,
      page: 0,
      rows: { curiosity: 0, valor: 0, insight: 0, resolve: 0 },
      everUpgraded: [],
      hand: [],
      keptTwists: [],
      subplot: null,
      completedSubplots: [],
      subplotTurn: -1,
      completing: false,
      horse: null,
      horseSpent: false,
    })),
    books: ids
      .slice(0, 3)
      .map((id, i) => makeBook(id, initialHexes[i].q, initialHexes[i].r, setup.names.length)),
    unpublished: ids.slice(3),
    pendingConflicts: [],
    characters: [],
    decks: {
      twist: shuffle(
        rng,
        twists.map((t) => t.id),
      ),
      subplot: shuffle(
        rng,
        subplots.map((t) => t.id),
      ),
      character: shuffle(
        rng,
        characters.map((t) => t.id),
      ),
    },
    discards: { twist: [], subplot: [] },
    pools: [1, 2, 3].map((act) =>
      shuffle(
        rng,
        tokens.filter((t) => t.act === act).map((t) => t.id),
      ).slice(0, setup.names.length),
    ),
    tokenStrong: tokens.map(() => true),
    act: 1,
    active: 0,
    turn: 1,
    acted: false,
    jobs: [],
    battle: null,
    log: ['A new story begins.'],
    over: false,
  };
  if (s.players.length === 2) s.books[0].slots[0].neutral = true;
  if (recordEvents) s.events = [];
  s.players.forEach((_, p) => {
    draw(s, p, 1, 'twist');
    draw(s, p, 1, 'subplot');
    s.jobs.push(job('setup', p));
  });
  s.jobs.push(job('start', 0));
  emit(s, { type: 'turn', player: 0 });
  return s;
}
export function assertInvariants(s: GameState) {
  const ids = [...s.books.map((b) => b.id), ...s.unpublished];
  if (ids.length !== books.length || new Set(ids).size !== books.length)
    throw Error('Book conservation');
  if (new Set(s.books.map((b) => `${b.q},${b.r}`)).size !== s.books.length)
    throw Error('Overlapping books');
  for (const [i, b] of s.books.entries()) {
    if (!Number.isInteger(b.q) || !Number.isInteger(b.r)) throw Error('Invalid book coordinate');
    if (i >= 3 && s.books.slice(0, i).filter((x) => adjacentBooks(x, b)).length < 2)
      throw Error('Unsupported book');
  }
  for (const p of s.players) if (!s.books[bookOf(p.page)]) throw Error('Figure off map');

  for (const [p, pl] of s.players.entries()) {
    const inTransit = s.jobs
      .filter((j) => j.type === 'bindingRedirect' && j.source === 'transfer' && j.p === p)
      .reduce((n, j) => n + (j.n ?? 1), 0);
    const onBooks =
      inTransit +
      s.books.reduce((n, b) => n + b.slots.filter((x) => x.owner === p).length + b.overflow[p], 0);
    const onChars = ownedChars(s, p).reduce(
      (n, c) => n + c.collected + c.used.reduce((a, b) => a + b, 0),
      0,
    );
    if (
      pl.supply + pl.reserves.reduce((a, b) => a + b, 0) + pl.out + onBooks + onChars !==
      CONFIG.supply + 2 * CONFIG.reserve
    )
      throw Error('Inkling conservation');
    if (
      !Number.isInteger(pl.points) ||
      [pl.supply, ...pl.reserves, pl.out, onBooks, onChars].some(
        (x) => !Number.isInteger(x) || x < 0,
      )
    )
      throw Error('Invalid resource count');
    for (const row of ROWS) {
      const n = s.books.reduce(
        (n, b) => n + b.slots.filter((x) => x.memory?.owner === p && x.memory.row === row).length,
        0,
      );
      if (n !== pl.rows[row] || n > 3) throw Error('Memory conservation');
    }
  }
  const tc = [
    ...s.decks.twist,
    ...s.discards.twist,
    ...s.players.flatMap((p) => p.hand),
    ...s.players.flatMap((p) => p.keptTwists),
    ...(s.battle?.cards ?? []),
  ];
  if (tc.length !== 15 || new Set(tc).size !== 15) throw Error('Twist conservation');
  const ch = [...s.decks.character, ...s.characters.map((c) => c.id)];
  if (ch.length !== 10 || new Set(ch).size !== 10) throw Error('Character conservation');
  for (const c of s.characters)
    if (c.collected > 3 || c.used.some((n, i) => n < 0 || n > characters[c.id].actions[i][0]))
      throw Error('Character capacity');
}
