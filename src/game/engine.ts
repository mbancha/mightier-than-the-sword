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
  let v = count(s, p, b) + (bookOf(s.players[p].page) === b ? s.players[p].rows.valor : 0);
  for (const c of ownedChars(s, p, b))
    if (s.battle?.book !== b || !suppressed(s, c.id))
      v += c.id === 1 && c.collected === 3 ? 5 : characters[c.id].power;
  if (s.books[b].id === 2 && s.books[b].overflow[p]) v += 2;
  if (s.books[b].id === 5 && ownedChars(s, p, b).some((c) => !suppressed(s, c.id))) v++;
  return v + (s.battle?.book === b ? s.battle.bonus[p] : 0);
}
export function fullBooks(s: GameState) {
  return s.books.flatMap((b, i) => {
    const empty = b.slots.filter((x) => x.owner === null).length;
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
  note(s, `${s.players[p].name}: +${n} plot points (${why}).`);
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
      s.players[p].progress = 0;
      s.players[p].completing = false;
    }
  }
}
function discard(s: GameState, p: number, id: number) {
  const h = s.players[p].hand;
  h.splice(h.indexOf(id), 1);
  s.discards.twist.push(id);
}
function progress(s: GameState, p: number, event: string, n = 1) {
  const pl = s.players[p];
  if (pl.subplot === null || pl.completing) return;
  const matches = [
    ['travel'],
    ['upgrade'],
    ['activate', 'upgrade'],
    ['place'],
    ['foreshadow'],
    ['shared'],
    ['twist'],
    ['conflict'],
    ['erase'],
    ['memory'],
  ];
  if (!matches[pl.subplot].includes(event)) return;
  pl.progress = Math.min(subplots[pl.subplot].target, pl.progress + n);
  if (pl.progress === subplots[pl.subplot].target) {
    pl.completing = true;
    queue(s, job('subplot', p, { card: pl.subplot }));
  }
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
    progress(s, p, 'foreshadow', take);
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
function place(s: GameState, p: number, b: number, slot: number | null) {
  const pl = s.players[p];
  if (!pl.supply) return;
  pl.supply--;
  emit(s, {
    type: 'place',
    player: p,
    book: s.books[b].id,
    source: slot === null ? 'overflow' : 'numbered',
  });
  if (slot === null) {
    if (s.books[b].id === 0) {
      pl.supply++;
      collect(s, p);
      note(s, 'An overflow Inkling drowns in the submarine.');
      emit(s, { type: 'erase', player: p, book: s.books[b].id, source: 'drowning' });
      progress(s, p, 'erase');
    } else s.books[b].overflow[p]++;
  } else {
    const spot = s.books[b].slots[slot];
    spot.owner = p;
    queue(s, job('checkConflict', p, { book: b }));
    if (slot > 0 && slot < s.books[b].slots.length - 1) draw(s, p, 1, 'twist');
    if (spot.memory) {
      const m = spot.memory;
      emit(s, { type: 'memoryReward', player: p, row: m.row, book: s.books[b].id });
      queue(s, ...memoryJobs(p, m.row, b), ...(m.owner !== p ? memoryJobs(m.owner, m.row, b) : []));
      progress(s, p, 'memory');
      if (m.owner !== p) progress(s, m.owner, 'shared');
    }
    progress(s, p, 'place');
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
    progress(s, actor, 'erase');
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
  progress(s, p, 'upgrade');
}
function finishAct(s: GameState) {
  s.battle = null;
  s.pendingConflicts = [];
  if (s.act === 3) {
    s.over = true;
    s.jobs = [];
    note(s, 'The final Act is complete. Highest plot points wins.');
    return;
  }
  s.act++;
  for (const b of s.books) {
    b.covered = false;
    for (const t of b.tokens) t.strong = true;
  }
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
    `Act ${s.act}: book points uncovered, old tokens strong, character Inklings returned and the reserve released.`,
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
function tokenJobs(p: number, id: number): Job[] {
  return content.tokenEffects[id].map(
    (effect) => ({ source: 'conflict token', ...effect, p }) as Job,
  );
}
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
  for (const p of participants) progress(s, p, 'conflict');
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
    queue(s, job('place', p, { book: b, mode: 'overflow', n: 2, optional: true }));
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
  bt.cards.push(id);
  emit(s, { type: 'twist', player: p, id, book: s.books[bt.book].id });
  bt.played[p]++;
  bt.slotPlayed++;
  if (bt.slotPlayed === 2) bt.extraUsed.push(p);
  note(s, `${s.players[p].name} plays ${twists[id].name}.`);
  if (s.books[bt.book].id === 4 && count(s, p, bt.book) === 1)
    bt.bonus[p] += CONFIG.iliadTwistBonus;
  if (ownedChars(s, p, bt.book).some((c) => c.id === 6) && !abilitySuppressed(s, 6))
    draw(s, p, 1, 'twist');
  cardEffect(s, p, id);
  progress(s, p, 'twist');
}
function charAction(s: GameState, p: number, c: Character, a: number) {
  c.used[a]++;
  emit(s, { type: 'activate', player: p, id: c.id });
  s.players[p].supply--;
  progress(s, p, 'activate');
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
        : reachable(s.books, from, j.n ?? CONFIG.baseMove + pl.rows.curiosity);
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
          if (c) {
            const cc = s.characters.find((x) => x.id === c.id)!;
            cc.page = page;
            cc.other = null;
          } else s.players[p].page = page;
          if (c?.id === 5) queue(s, job('checkConflict', p, { book: bookOf(page) }));
          if (j.source === 'normal' && bookOf(page) !== bookOf(j.origin ?? from))
            progress(s, p, 'travel');
        },
        'Move',
        { page },
      );
  }
  if (j.type === 'move') {
    const c = j.char === undefined ? null : s.characters.find((c) => c.id === j.char)!;
    const from = c ? c.page : pl.page;
    const remaining = j.n ?? CONFIG.baseMove + pl.rows.curiosity;
    if (j.source !== 'normal' || from !== (j.origin ?? from))
      add(
        'endMove',
        'End move',
        (state) => {
          done(state);
          if (j.source === 'normal' && bookOf(from) !== bookOf(j.origin ?? from))
            progress(state, p, 'travel');
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
            if (c) {
              const cc = state.characters.find((x) => x.id === c.id)!;
              cc.page = page;
              cc.other = null;
            } else state.players[p].page = page;
            if (c?.id === 5) queue(state, job('checkConflict', p, { book: bookOf(page) }));
          },
          'Step',
          { page },
        );
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
            detail: 'Touches at least two books. Then place an Inkling in a neighboring overflow.',
          },
        );
  }
  if (j.type === 'publishOverflow' && pl.supply)
    s.books.forEach((b, bi) => {
      if (adjacentBooks(s.books[j.book!], b))
        add(
          `publishOverflow:${bi}`,
          `Overflow at ${books[b.id].title}`,
          (state) => {
            done(state);
            place(state, p, bi, null);
          },
          'Publication bonus',
          { book: bi },
        );
    });
  if (j.type === 'turn') {
    if (!s.acted) {
      const pj = job('place', p, {
        page: pl.page,
        n: pl.rows.resolve >= 2 ? pl.rows.resolve : 1,
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
      for (const option of upgradeOptions(s, job('upgrade', p, { page: pl.page })))
        add(
          option.key.replace('upgrade:', 'memoryHere:'),
          option.label,
          (state) => {
            state.acted = true;
            state.jobs.unshift(job('upgrade', p, { page: pl.page }));
            option.run(state);
          },
          'Memory',
          { book: option.book, page: pl.page, detail: option.detail },
        );
    }

    if (!s.acted && pl.supply) {
      add(
        'place',
        'Place Inklings',
        (s) => {
          s.acted = true;
          queue(
            s,
            job('place', p, {
              page: pl.page,
              n: pl.rows.resolve >= 2 ? pl.rows.resolve : 1,
              optional: true,
            }),
          );
        },
        'Action',
      );
      if (pl.rows.resolve === 1)
        for (const card of pl.hand)
          add(
            `boost:${card}`,
            `Discard ${twists[card].name} to place 2`,
            (s) => {
              s.acted = true;
              discard(s, p, card);
              queue(s, job('place', p, { page: pl.page, n: 2, optional: true }));
            },
            'Action',
          );
      const up = upgradeOptions(s, job('upgrade', p, { page: pl.page }));
      if (up.length)
        add(
          'upgrade',
          'Leave a memory',
          (s) => {
            s.acted = true;
            queue(s, job('upgrade', p, { page: pl.page }));
          },
          'Action',
        );
      for (const c of ownedChars(s, p))
        characters[c.id].actions.forEach(([max, text], a) => {
          if (c.used[a] < max)
            add(
              `activate:${c.id}:${a}`,
              `Activate ${characters[c.id].name}`,
              (s) => {
                s.acted = true;
                charAction(s, p, s.characters.find((x) => x.id === c.id)!, a);
              },
              'Character',
              { detail: text },
            );
        });
    }
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
  if (j.type === 'place') {
    const b = j.book ?? bookOf(j.page ?? pl.page),
      page = j.page ?? pl.page;
    const spots = s.books[b].slots.flatMap((spot, i) =>
      spot.page === page % 2 && spot.owner === null ? [i] : [],
    );
    const addPlace = (k: number | null) =>
      add(
        `place:${k}`,
        k === null
          ? `Place in shared overflow · ${books[s.books[b].id].title}`
          : `Place in space ${k + 1} · ${pageLabel(s, page)}`,
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
            c.page = a;
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
        j.type === 'transfer' || j.mode === 'own' ? owner === p : owner !== p;
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
              if (s.books[j.book!].id === 0) {
                s.players[p].supply++;
                collect(s, p);
                emit(s, {
                  type: 'erase',
                  player: p,
                  book: s.books[j.book!].id,
                  source: 'drowning',
                });
                progress(s, p, 'erase');
              } else s.books[j.book!].overflow[p]++;
            } else {
              erase(s, owner, b, k, p);
              if (j.source === 'experiment') s.battle!.bonus[p] += CONFIG.experimentPerErased;
              if (j.source === 'draculaBook') s.battle!.bonus[p] += CONFIG.draculaBookBonus;
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
      s.discards.subplot.push(j.card!);
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
        if (s.books[j.book!].id === 0) {
          s.players[p].supply += n;
          for (let i = 0; i < n; i++) collect(s, p);
        } else s.books[j.book!].overflow[p] += n;
      });
    pass();
  }
  if (j.type === 'takeToken' || j.type === 'moon')
    for (const id of s.pools[s.act - 1])
      add(
        `token:${id}`,
        tokens[id].name,
        (s) => {
          done(s);
          emit(s, { type: 'token', player: p, id, source: j.type });
          s.pools[s.act - 1].splice(s.pools[s.act - 1].indexOf(id), 1);
          if (j.type === 'moon') {
            queue(s, ...tokenJobs(p, id), job('moon', p));
            return;
          }
          const b = s.books[s.battle!.book];
          if (!b.covered) {
            points(
              s,
              p,
              CONFIG.bookPoints * tokens[id].act,
              'first conflict at this book this Act',
            );
            b.covered = true;
          }
          b.tokens.push({ id, strong: true });
          queue(
            s,
            job('tokenRewards', p, { book: s.battle!.book, remaining: b.tokens.map((t) => t.id) }),
          );
        },
        'Conflict reward',
        { detail: tokens[id].text },
      );
  if (j.type === 'tokenRewards')
    for (const id of j.remaining ?? [])
      add(
        `reward:${id}`,
        `${tokens[id].name} · ${s.books[j.book!].tokens.find((t) => t.id === id)!.strong ? tokens[id].text : tokens[id].act + ' plot points'}`,
        (s) => {
          done(s);
          const t = s.books[j.book!].tokens.find((t) => t.id === id)!;
          const rewards = t.strong
            ? tokenJobs(p, id)
            : [job('points', p, { n: tokens[id].act, source: 'weak conflict token' })];
          t.strong = false;
          queue(s, ...rewards, { ...j, remaining: j.remaining!.filter((x) => x !== id) });
        },
        'Reward order',
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
        } else if (s.pools[s.act - 1].length) battleStart(s, j.book!);
      }
      continue;
    }
    if (j.type === 'newsubplot') {
      s.jobs.shift();
      draw(s, p, 1, 'subplot');
      continue;
    }
    if (j.type === 'start') {
      const waiting = fullBooks(s);
      if (waiting.length && s.pools[s.act - 1].length) {
        battleStart(s, waiting[0]);
        continue;
      }
      s.jobs.shift();
      s.acted = false;
      if (!pl.supply) {
        emit(s, { type: 'moon', player: p });
        note(s, `${pl.name} shoots the moon.`);
        queue(s, job('moon', p));
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
    if (j.type === 'resolve' && !s.pools[s.act - 1].length) {
      finishAct(s);
      continue;
    }
    if (j.type === 'moon' && !s.pools[s.act - 1].length) {
      finishAct(s);
      continue;
    }
    if (j.type === 'end') {
      s.jobs.shift();
      const c = ownedChars(s, p).find((c) => c.id === 1 && c.collected === 3);
      queue(
        s,
        ...(c ? [job('move', p, { char: 1, n: 1, source: 'character' })] : []),
        job('handLimit', p),
        job('next', p),
      );
      continue;
    }
    if (j.type === 'handLimit') {
      if (pl.hand.length > CONFIG.baseHand + pl.rows.insight) {
        queue(s, job('discard', p));
        continue;
      }
      s.jobs.shift();
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
      for (const p of bt.participants) {
        if (id === 6)
          js.push(job('erase', p, { book: bt.book, mode: 'own', n: 1, source: 'draculaBook' }));
        if (id === 8) js.push(job('cycle', p));
      }
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
        const winner = bt.participants.reduce((a, b) =>
          power(s, b, bt.book) > power(s, a, bt.book) ? b : a,
        );
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
        s.discards.twist.push(...bt.cards.splice(0));
        const js: Job[] = [];
        for (const p of bt.hero)
          if (p === winner) js.push(job('points', p, { n: 2, source: 'A Lasting Legend' }));
        for (const p of bt.tribute)
          if (p === winner) js.push(job('points', p, { n: 4, source: 'Tribute to the Gods' }));
        for (const p of bt.complete)
          if (p === winner && s.players[p].subplot !== null && !s.players[p].completing) {
            s.players[p].completing = true;
            js.push(job('subplot', p, { card: s.players[p].subplot! }));
          }
        for (const p of bt.revenge) if (p !== winner) js.push(job('revenge', p, { book: bt.book }));
        const id = s.books[bt.book].id;
        for (const p of bt.participants) {
          if (id === 1) js.push(job('move', p, { mode: 'any', source: 'book' }));
          if (id === 3)
            js.push(
              job('points', p, { n: s.players[p].everUpgraded.length, source: 'The Odyssey' }),
            );
          if (id === 7) js.push(job('optionalForeshadow', p, { n: 1 }));
        }
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
      b.slots.forEach((spot, k) => {
        if (spot.owner !== null) erase(s, spot.owner, j.book!, k, p, true);
      });
      b.overflow.forEach((n, owner) => {
        for (let i = 0; i < n; i++) erase(s, owner, j.book!, null, p, true);
      });
      continue;
    }
    if (j.type === 'tokenRewards' && !j.remaining?.length) {
      s.jobs.shift();
      queue(s, job('publish', p), job('afterRewards', p));
      continue;
    }
    if (j.type === 'afterRewards') {
      s.jobs.shift();
      s.battle = null;
      if (s.pools[s.act - 1].length)
        queue(s, ...s.pendingConflicts.splice(0).map((book) => job('checkConflict', p, { book })));
      if (!s.pools[s.act - 1].length) {
        const owner = s.active,
          c = ownedChars(s, owner).find((c) => c.id === 1 && c.collected === 3);
        s.jobs = [];
        queue(
          s,
          ...(c ? [job('move', owner, { char: 1, n: 1, source: 'character' })] : []),
          job('handLimit', owner),
          job('advanceAct', owner),
        );
      }
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
      Array.from({ length: n }, () => ({ page: side, owner: null, memory: null })),
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
      subplot: null,
      progress: 0,
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
    act: 1,
    active: 0,
    turn: 1,
    acted: false,
    jobs: [],
    battle: null,
    log: ['A new story begins.'],
    over: false,
  };
  if (recordEvents) s.events = [];
  s.players.forEach((_, p) => {
    draw(s, p, 2, 'twist');
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
    const onBooks = s.books.reduce(
      (n, b) => n + b.slots.filter((x) => x.owner === p).length + b.overflow[p],
      0,
    );
    const onChars = ownedChars(s, p).reduce(
      (n, c) => n + c.collected + c.used.reduce((a, b) => a + b, 0),
      0,
    );
    if (pl.supply + pl.reserves.reduce((a, b) => a + b, 0) + pl.out + onBooks + onChars !== 10)
      throw Error('Inkling conservation');
    if (
      [pl.supply, ...pl.reserves, pl.out, onBooks, onChars, pl.points].some(
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
    ...(s.battle?.cards ?? []),
  ];
  if (tc.length !== 15 || new Set(tc).size !== 15) throw Error('Twist conservation');
  const ch = [...s.decks.character, ...s.characters.map((c) => c.id)];
  if (ch.length !== 10 || new Set(ch).size !== 10) throw Error('Character conservation');
  for (const c of s.characters)
    if (c.collected > 3 || c.used.some((n, i) => n < 0 || n > characters[c.id].actions[i][0]))
      throw Error('Character capacity');
}
