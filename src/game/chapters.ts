import source from '../data/content.json';
import { makeRng, shuffled, type RngState } from '../kernel/rng';
import { adjacentBooks, publicationSites, initialHexes } from './topology';
export const content = source.redesign;
export const bookmarkNames = [
  'Larger Than Life',
  'Well Read',
  'Deep Inkwell',
  'Effortless Twists',
  'Hidden Strength',
  'An Unlikely Companion',
  'Strength in the Margins',
  'Command the Page',
  'Double Take',
  'A Wider World',
  'Make Room',
];
export const bookmarkText = [
  'Protagonist +5 power',
  'Base minimum hand 5',
  'Ink capacity +5',
  'Twists cost 1 ink',
  'Subplots as Twists give +2',
  'Draw a secondary character',
  'Overflow Inklings +3 power each',
  'Page Inklings +2 power each',
  'Up to two cards per Twist opportunity',
  'Protagonist moves up to four spaces',
  'Bump enemy page Inklings to overflow',
];
export interface Card {
  id: number;
  kind: 'twist' | 'subplot';
  design: number;
}
export interface Figure {
  id: number;
  page: number;
  primary: boolean;
}
export interface Player {
  name: string;
  bot: boolean;
  ink: number;
  supply: number;
  figures: Figure[];
  hand: Card[];
  marks: number[];
  ongoing: number[];
  books: number[];
  chapter: number;
}
export interface Book {
  id: number;
  q: number;
  r: number;
  slots: (number | null)[];
  overflow: number[];
  mark: number | null;
  contested: boolean;
}
type Job = { type: string; p: number; [key: string]: any };
export interface State {
  edition: string;
  rng: RngState;
  players: Player[];
  books: Book[];
  stack: number[];
  marks: number[];
  characters: number[];
  deck: Card[];
  discard: Card[];
  active: number;
  turn: number;
  jobs: Job[];
  log: string[];
  winner: number | null;
  moving: number[];
  extraMove: number;
  extraPlace: number;
  source: number | null;
  used: string[];
  battle: null | {
    book: number;
    participants: number[];
    start: State | null;
    bonus: number[];
    played: Card[];
    ignored: number[];
  };
}
export interface Action {
  key: string;
  label: string;
  run: (s: State) => void;
}
const genre = (id: number) => source.books[id].genre;
const book = (s: State, id: number) => s.books.find((b) => b.id === id)!;
const bid = (page: number) => Math.floor(page / 2);
const pageSide = (b: Book, k: number) => (k < source.books[b.id].page_slots[0] ? 0 : 1);
export const pageOf = (b: Book, k: number) => b.id * 2 + pageSide(b, k);
const has = (p: Player, n: number) => p.marks.includes(n);
const owns = (p: Player, n: number) => p.ongoing.includes(n);
const count = (b: Book, p: number) => b.slots.filter((x) => x === p).length + b.overflow[p];
const pages = (b: Book, p: number) => b.slots.flatMap((v, k) => (v === p ? [k] : []));
const allCount = (s: State, p: number) => s.books.filter((b) => count(b, p) > 0).length;
const consecutive = (b: Book, p: number) => b.slots.some((v, k) => v === p && b.slots[k + 1] === p);
export const capacity = (p: Player) =>
  7 + (has(p, 2) ? 5 : 0) + (owns(p, 2) ? 2 : 0) + (owns(p, 13) ? 2 : 0);
export const minimum = (p: Player) =>
  (has(p, 1) ? 5 : 1) + [1, 8, 12].filter((n) => owns(p, n)).length;
const gain = (p: Player, n: number) => (p.ink = Math.min(capacity(p), p.ink + n));
const note = (s: State, t: string) => {
  s.log.push(t);
  if (s.log.length > 100) s.log.shift();
};
function draw(s: State, p: number, n: number) {
  while (n-- > 0) {
    if (!s.deck.length) {
      s.deck = shuffled(s.rng, s.discard);
      s.discard = [];
    }
    const c = s.deck.pop();
    if (c) s.players[p].hand.push(c);
  }
}
export function neighbors(s: State, page: number) {
  const b = book(s, bid(page));
  if (!b) return [];
  const out = [b.id * 2 + 1 - (page % 2)];
  for (const other of s.books) {
    if (!adjacentBooks(b, other)) continue;
    const dx = other.q - b.q + (other.r - b.r) / 2;
    if (page % 2 === (dx > 0 ? 1 : 0)) out.push(other.id * 2 + (dx > 0 ? 0 : 1));
  }
  return out;
}
function reachable(s: State, start: number, n: number) {
  let seen = new Set<number>();
  let frontier = [start];
  for (let i = 0; i < n; i++) {
    frontier = frontier.flatMap((x) => neighbors(s, x)).filter((x) => !seen.has(x));
    frontier.forEach((x) => seen.add(x));
  }
  seen.delete(start);
  return [...seen];
}
function push(s: State, ...jobs: Job[]) {
  s.jobs.unshift(...jobs);
}
function newBook(s: State, id: number, q: number, r: number) {
  s.books.push({
    id,
    q,
    r,
    slots: Array(source.books[id].slots).fill(null),
    overflow: s.players.map(() => 0),
    contested: false,
    mark: s.marks.pop() ?? null,
  });
}
function endTurn(s: State) {
  for (let i = 0; i < s.players.length; i++) {
    const p = (s.active + i) % s.players.length;
    draw(s, p, Math.max(0, minimum(s.players[p]) - s.players[p].hand.length));
  }
  s.active = (s.active + 1) % s.players.length;
  s.turn++;
  s.moving = [];
  s.extraMove = 0;
  s.extraPlace = 0;
  s.source = null;
  s.used = [];
  s.jobs = [{ type: 'start', p: s.active }];
}
export function newGame(names: string[], seed = 1, bots: boolean[] = []): State {
  const rng = makeRng(seed);
  const ids = shuffled(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const initial = [0, 1, 2].map((g) => shuffled(rng, [g * 3, g * 3 + 1, g * 3 + 2])[0]);
  const cards: Card[] = [];
  let serial = 0;
  for (let d = 0; d < 9; d++)
    for (let k = 0; k < 5; k++) cards.push({ id: serial++, kind: 'twist', design: d });
  for (let d = 0; d < 15; d++)
    for (let k = 0; k < 2; k++) cards.push({ id: serial++, kind: 'subplot', design: d });
  const s: State = {
    edition: 'chapters-1',
    rng,
    players: names.map((name, i) => ({
      name,
      bot: !!bots[i],
      ink: 7,
      supply: 12,
      figures: [{ id: ids.pop()!, page: initial[0] * 2, primary: true }],
      hand: [],
      marks: [],
      ongoing: [],
      books: [],
      chapter: 1,
    })),
    books: [],
    stack: shuffled(
      rng,
      [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !initial.includes(i)),
    ),
    marks: shuffled(rng, [0, 1, 2, 3, 4, 5, 5, 5, 6, 7, 8, 9, 10]),
    characters: ids,
    deck: shuffled(rng, cards),
    discard: [],
    active: 0,
    turn: 1,
    jobs: names.map((_, p) => ({ type: 'setup', p })),
    log: [],
    winner: null,
    moving: [],
    extraMove: 0,
    extraPlace: 0,
    source: null,
    used: [],
    battle: null,
  };
  initial.forEach((id, i) => newBook(s, id, initialHexes[i].q, initialHexes[i].r));
  s.players.forEach((_, p) => draw(s, p, 1));
  s.jobs.push({ type: 'start', p: 0 });
  return s;
}
function moveEffects(s: State, p: number, f: Figure, old: number) {
  const b = book(s, bid(f.page));
  const js: Job[] = [];
  if (bid(old) !== b.id && !s.used.includes(`arrival:${b.id}`)) {
    s.used.push(`arrival:${b.id}`);
    if (b.id === 1 && s.players[p].figures.length > 1) js.push({ type: 'express', p, char: f.id });
    if (b.id === 3 && s.players[p].hand.length) js.push({ type: 'exchange', p });
    if (b.id === 5) js.push({ type: 'transfer', p, to: b.id, mode: 'overflow', n: 1 });
  }
  if (f.id === 0 && !s.used.includes('nemo')) {
    s.used.push('nemo');
    js.push({ type: 'transfer', p, to: b.id, mode: 'overflow', n: 2 });
  }
  if (f.id === 5 && s.players[p].ink && !s.used.includes('aeneas')) {
    s.used.push('aeneas');
    js.push({ type: 'aeneas', p, to: b.id });
  }
  push(s, ...js);
}
function placed(s: State, p: number, b: Book, k: number | null) {
  if (k === null) b.overflow[p]++;
  else b.slots[k] = p;
  s.players[p].supply--;
  note(s, `${s.players[p].name} places an Inkling in ${source.books[b.id].title}.`);
  const eligible = subplotCandidates(s, p, 'place', b.id, k);
  push(
    s,
    ...(eligible.length ? [{ type: 'subplot', p, eligible }] : []),
    ...(k !== null ? [{ type: 'bonus', p, book: b.id, k }] : []),
    ...(k !== null && b.id === 0 && k === 1
      ? [{ type: 'transfer', p, to: b.id, mode: 'overflow', n: 1 }]
      : []),
    ...(k !== null && b.id === 8 && k === 1 ? [{ type: 'laboratory', p, book: b.id }] : []),
    { type: 'check', p, book: b.id },
  );
}
function subplotCandidates(
  s: State,
  p: number,
  event: string,
  id: number,
  k: number | null = null,
  winner = -1,
) {
  const b = book(s, id);
  if (!b) return [];
  const pl = s.players[p];
  const g = genre(id);
  const pg = pages(b, p);
  const start = s.battle?.start;
  const sb = start ? book(start, id) : b;
  const participating = !!s.battle?.participants.includes(p);
  const primary = pl.figures.find((f) => f.primary)!;
  const enemyFigure = s.players.some(
    (x, i) => i !== p && x.figures.some((f) => bid(f.page) === id),
  );
  const yes = [
    event === 'place' && g === 'Voyages' && allCount(s, p) >= 3,
    event === 'place' &&
      g === 'Voyages' &&
      pg.some((x) => pageSide(b, x) === 0) &&
      pg.some((x) => pageSide(b, x) === 1),
    event === 'place' && g === 'Voyages' && k === null && b.overflow[p] >= 3 && pg.length > 0,
    event === 'place' &&
      g === 'Voyages' &&
      s.books.some(
        (x) => x.id !== id && genre(x.id) === 'Voyages' && count(x, p) > 0 && adjacentBooks(b, x),
      ),
    event === 'conflict' && g === 'Voyages' && participating && sb.overflow[p] >= 2,
    event === 'place' && g === 'Epics' && k !== null && consecutive(b, p),
    event === 'place' &&
      g === 'Epics' &&
      (k === 0 || k === b.slots.length - 1) &&
      b.slots[0] === p &&
      b.slots.at(-1) === p,
    event === 'place' && g === 'Epics' && count(b, p) >= 3 && pg.length > 0 && b.overflow[p] > 0,
    event === 'conflict' &&
      g === 'Epics' &&
      winner === p &&
      bid(primary.page) === id &&
      enemyFigure,
    event === 'conflict' && g === 'Epics' && winner === p && sb.contested,
    event === 'place' &&
      g === 'Gothic Horror' &&
      k !== null &&
      b.slots.some(
        (v, i) =>
          v === p &&
          [b.slots[i - 1], b.slots[i + 1]].some((x) => x !== undefined && x !== null && x !== p),
      ),
    event === 'place' && g === 'Gothic Horror' && pg.length > 0 && b.overflow[p] >= 2,
    event === 'place' &&
      g === 'Gothic Horror' &&
      k !== null &&
      pg.some((a) =>
        pg.some((z) => z > a + 1 && b.slots.slice(a + 1, z).some((v) => v !== null && v !== p)),
      ),
    event === 'conflict' &&
      g === 'Gothic Horror' &&
      participating &&
      sb.overflow[p] >= 2 &&
      s.players.some((_, i) => i !== p && pages(sb, i).length >= 2),
    event === 'conflict' && g === 'Gothic Horror' && winner === p && pl.ink <= 2,
  ];
  return pl.hand
    .filter(
      (c) =>
        c.kind === 'subplot' &&
        yes[c.design] &&
        (!start || start.players[p].hand.some((x) => x.id === c.id)),
    )
    .map((c) => c.id);
}
export function power(s: State, p: number, id: number) {
  const b = book(s, id),
    pl = s.players[p];
  let n =
    pages(b, p).length * (has(pl, 7) ? 3 : 1) +
    b.overflow[p] * (1 + (has(pl, 6) ? 3 : 0) + (id === 2 ? 1 : 0));
  for (const f of pl.figures.filter((f) => bid(f.page) === id)) {
    n += content.characters[f.id].power + (id === 4 ? 1 : 0) + (f.primary && has(pl, 0) ? 5 : 0);
    if (f.id === 2 && b.overflow[p] >= 2) n += 2;
    if (
      f.id === 3 &&
      s.players.some((x, i) => i !== p && x.figures.some((y) => bid(y.page) === id))
    )
      n += 2;
    if (f.id === 6) n += s.battle?.participants.filter((i) => i !== p).length ?? 0;
    if (f.primary) {
      if (owns(pl, 4) && b.overflow[p]) n++;
      if (owns(pl, 6)) n++;
      if (
        owns(pl, 10) &&
        s.players.some((x, i) => i !== p && x.figures.some((y) => bid(y.page) === id))
      )
        n++;
    }
  }
  return n + (s.battle?.book === id ? s.battle.bonus[p] : 0);
}
function beginConflict(s: State, id: number) {
  const b = book(s, id);
  const ps = s.players.flatMap((pl, p) =>
    count(b, p) || pl.figures.some((f) => bid(f.page) === id) ? [p] : [],
  );
  if (!ps.length) return;
  const snapshot = structuredClone(s);
  snapshot.battle = null;
  s.battle = {
    book: id,
    participants: ps,
    start: snapshot,
    bonus: s.players.map(() => 0),
    played: [],
    ignored: [],
  };
  const js: Job[] = [];
  if (id === 6 && b.slots[0] !== null) js.push({ type: 'castle', p: b.slots[0], book: id });
  for (const p of ps)
    if (s.players[p].figures.some((f) => f.id === 8 && bid(f.page) === id) && s.players[p].ink)
      js.push({ type: 'hyde', p });
  b.slots.forEach((p, k) => {
    if (p !== null) js.push({ type: 'twist', p, k, left: has(s.players[p], 8) ? 2 : 1 });
  });
  js.push({ type: 'result', p: s.active });
  push(s, ...js);
  note(s, `Conflict at ${source.books[id].title}.`);
}
function disconnected(s: State) {
  if (!s.books.length) return false;
  const seen = new Set([s.books[0].id]);
  let change = true;
  while (change) {
    change = false;
    for (const b of s.books)
      if (!seen.has(b.id) && s.books.some((x) => seen.has(x.id) && adjacentBooks(x, b))) {
        seen.add(b.id);
        change = true;
      }
  }
  return seen.size !== s.books.length;
}
function claim(s: State, p: number, id: number) {
  const b = book(s, id);
  s.players[p].books.push(id);
  s.books = s.books.filter((x) => x.id !== id);
  if (s.players[p].books.length >= (s.players.length === 2 ? 3 : 2)) {
    s.winner = p;
    s.jobs = [];
    return;
  }
  const jobs: Job[] = [];
  for (let n = 0; n < s.players.length; n++) {
    const owner = (s.active + n) % s.players.length;
    for (const f of s.players[owner].figures.filter((f) => bid(f.page) === id))
      jobs.push({ type: 'evacuate', p: owner, char: f.id, from: { q: b.q, r: b.r } });
  }
  if (disconnected(s) && s.stack.length) {
    const next = s.stack.pop()!;
    newBook(s, next, b.q, b.r);
  } else if (disconnected(s))
    jobs.push({ type: 'compact', p, old: s.books.map((x) => ({ id: x.id, q: x.q, r: x.r })) });
  push(s, ...jobs);
}
function normalize(s: State) {
  let guard = 0;
  while (s.jobs.length && s.winner === null && guard++ < 200) {
    const j = s.jobs[0];
    if (j.type === 'check') {
      s.jobs.shift();
      const b = book(s, j.book);
      if (b && b.slots.every((x) => x !== null)) beginConflict(s, b.id);
    } else if (j.type === 'result') {
      s.jobs.shift();
      const bt = s.battle!,
        b = book(s, bt.book);
      const tie = (p: number) => {
        const i = b.slots.indexOf(p);
        return i < 0 ? 100 + ((p - s.active + s.players.length) % s.players.length) : i;
      };
      const winner = [...bt.participants].sort(
        (a, c) => power(s, c, b.id) - power(s, a, b.id) || tie(a) - tie(c),
      )[0];
      note(
        s,
        `${s.players[winner].name} wins ${source.books[b.id].title} with ${power(s, winner, b.id)} power.`,
      );
      const js: Job[] = bt.participants.flatMap((p) => {
        const eligible = subplotCandidates(s, p, 'conflict', b.id, null, winner);
        return eligible.length ? [{ type: 'subplot', p, eligible }] : [];
      });
      js.push({ type: 'cleanup', p: winner, book: b.id });
      push(s, ...js);
    } else if (j.type === 'cleanup') {
      s.jobs.shift();
      const b = book(s, j.book),
        second = b.contested;
      for (let p = 0; p < s.players.length; p++) {
        s.players[p].supply += b.overflow[p];
        b.overflow[p] = 0;
      }
      b.slots.forEach((p, k) => {
        if (p !== null) {
          if (b.id === 7 && !second) b.overflow[p]++;
          else s.players[p].supply++;
          b.slots[k] = null;
        }
      });
      s.discard.push(...s.battle!.played);
      s.battle = null;
      if (second) claim(s, j.p, b.id);
      else {
        b.contested = true;
        if (b.mark !== null) {
          const m = b.mark;
          s.players[j.p].marks.push(m);
          b.mark = null;
          if (m === 5) push(s, { type: 'character', p: j.p });
        }
      }
    } else if (j.type === 'finish') {
      s.jobs.shift();
      endTurn(s);
    } else if (j.type === 'start' && s.players[j.p].ink === 0) {
      s.jobs.shift();
      chapter(s, j.p);
    } else break;
  }
  if (guard >= 200) throw Error('Automatic effect loop');
}
function chapter(s: State, p: number) {
  const pl = s.players[p];
  pl.chapter++;
  pl.ink = capacity(pl);
  note(s, `${pl.name} begins chapter ${pl.chapter}.`);
  s.jobs = [...(s.stack.length ? [{ type: 'publish', p }] : []), { type: 'finish', p }];
}
const bonusTable = content.spaceBonuses as [number, string, number][][];
export function legalActions(s: State): Action[] {
  normalize(s);
  if (s.winner !== null) return [];
  const j = s.jobs[0];
  if (!j) return [];
  const p = j.p,
    pl = s.players[p],
    out: Action[] = [];
  const add = (key: string, label: string, fn: (s: State) => void) =>
    out.push({ key, label, run: fn });
  const done = (st: State) => st.jobs.shift();
  const skip = () => add('skip', 'Continue without this benefit', done);
  const b = j.book !== undefined ? book(s, j.book) : undefined;
  if (j.type === 'setup') {
    for (const bk of s.books)
      for (let side = 0; side < 2; side++)
        add(
          `setup:${bk.id}:${side}`,
          `Start on ${source.books[bk.id].title}, ${side ? 'right' : 'left'} page`,
          (st) => {
            st.players[p].figures[0].page = bk.id * 2 + side;
            done(st);
          },
        );
  }
  if (j.type === 'start') {
    if (pl.ink <= 3) add('chapter', 'End chapter: refill ink and pass', (st) => chapter(st, p));
    if (pl.supply === 0) {
      for (const bk of s.books.filter((x) => count(x, p) > 0))
        add(`force:${bk.id}`, `Resolve conflict at ${source.books[bk.id].title}`, (st) => {
          done(st);
          push(st, { type: 'finish', p });
          beginConflict(st, bk.id);
        });
    } else
      add('turn', 'Begin movement', (st) => {
        done(st);
        push(st, { type: 'movement', p });
      });
  }
  if (j.type === 'movement') {
    for (const f of pl.figures) {
      const first = !s.moving.includes(f.id),
        paid = s.extraMove < 1 + (owns(pl, 3) ? 1 : 0) + (owns(pl, 14) ? 1 : 0) && pl.ink > 0;
      if (!first) continue;
      const range = first
        ? f.primary
          ? (has(pl, 9) ? 4 : 1) + (owns(pl, 0) ? 1 : 0)
          : 1
        : f.id === 1
          ? 2
          : 1;
      for (const dest of reachable(s, f.page, range))
        add(
          `move:${f.id}:${dest}`,
          `${first ? 'Move' : 'Pay 1 ink to move'} ${content.characters[f.id].name} to ${source.books[bid(dest)].title}, ${dest % 2 ? 'right' : 'left'}`,
          (st) => {
            const figure = st.players[p].figures.find((x) => x.id === f.id)!,
              old = figure.page;
            figure.page = dest;
            if (first) st.moving.push(f.id);
            else {
              st.extraMove++;
              st.players[p].ink--;
            }
            push(st, { type: 'route', p, char: f.id, origin: old });
          },
        );
    }
    if (pl.figures.every((f) => s.moving.includes(f.id)))
      for (const f of pl.figures)
        add(`source:${f.id}`, `Place from ${content.characters[f.id].name}`, (st) => {
          done(st);
          st.source = f.id;
          push(st, { type: 'place', p, char: f.id, normal: true, first: true });
        });
  }
  if (j.type === 'route') {
    const f = pl.figures.find((x) => x.id === j.char)!;
    const max = 1 + (owns(pl, 3) ? 1 : 0) + (owns(pl, 14) ? 1 : 0);
    if (pl.ink && s.extraMove < max)
      for (const dest of reachable(s, f.page, f.id === 1 ? 2 : 1))
        add(
          `step:${dest}`,
          `Pay 1 ink: move ${content.characters[f.id].name} to ${source.books[bid(dest)].title}, ${dest % 2 ? 'right' : 'left'}`,
          (st) => {
            st.players[p].ink--;
            st.extraMove++;
            st.players[p].figures.find((x) => x.id === j.char)!.page = dest;
          },
        );
    add('arrive', 'Finish this character movement', (st) => {
      done(st);
      moveEffects(st, p, st.players[p].figures.find((x) => x.id === j.char)!, j.origin);
    });
  }
  if (j.type === 'place') {
    const f = pl.figures.find((x) => x.id === j.char);
    const target = j.book !== undefined ? book(s, j.book) : f ? book(s, bid(f.page)) : undefined;
    if (!target) {
      add('lost', 'Finish: original page has left the map', done);
    } else if (pl.supply > 0) {
      const paid = j.normal && !j.first;
      if (paid && pl.ink < 1) skip();
      else {
        const ks = target.slots.flatMap((v, k) =>
          pageOf(target, k) === (f?.page ?? -1) && (v === null || (has(pl, 10) && v !== p))
            ? [k]
            : [],
        );
        for (const k of j.overflow
          ? [null]
          : ks.length
            ? [...ks, ...(paid && owns(pl, 7) ? [null] : [])]
            : [null])
          add(
            `place:${k}`,
            `${paid ? 'Pay 1 ink: ' : ''}Place ${k === null ? 'in overflow' : `in space ${k + 1}`} of ${source.books[target.id].title}`,
            (st) => {
              done(st);
              const dest = book(st, target.id);
              if (paid) {
                st.players[p].ink--;
                st.extraPlace++;
              }
              if (j.normal) {
                push(st, { type: 'afterPlace', p, char: j.char, first: j.first });
              }
              if (k !== null && dest.slots[k] !== null) {
                dest.overflow[dest.slots[k]!]++;
                dest.slots[k] = null;
              }
              placed(st, p, dest, k);
            },
          );
      }
    } else skip();
  }
  if (j.type === 'afterPlace') {
    if (j.first && j.char === 7 && pl.ink && pl.supply >= 2)
      add('creature', 'Pay 1 ink: add 2 overflow Inklings', (st) => {
        done(st);
        st.players[p].ink--;
        push(
          st,
          ...Array.from({ length: 2 }, () => ({
            type: 'place',
            p,
            book: bid(st.players[p].figures.find((x) => x.id === j.char)!.page),
            overflow: true,
          })),
          { type: 'afterPlace', p, char: j.char, first: false },
        );
      });
    const max = 1 + (owns(pl, 5) ? 1 : 0) + (owns(pl, 11) ? 1 : 0);
    if (pl.ink && pl.supply && s.extraPlace < max)
      add('extra', 'Buy an additional placement (1 ink)', (st) => {
        done(st);
        push(st, { type: 'place', p, char: j.char, normal: true, first: false });
      });
    add('end', 'Finish placement', (st) => {
      done(st);
      push(st, { type: 'finish', p });
    });
  }
  if (j.type === 'bonus' && b) {
    const reward = bonusTable[b.id][j.k - 1];
    if (reward && pl.ink >= reward[0] && (reward[1] !== 'overflow' || pl.supply >= reward[2]))
      add(
        'buy',
        `Pay ${reward[0]} ink: ${reward[1] === 'draw' ? 'draw' : reward[1] === 'ink' ? 'gain' : 'place in overflow'} ${reward[2]} ${reward[1] === 'draw' ? 'cards' : reward[1] === 'ink' ? 'ink' : 'Inklings'}`,
        (st) => {
          done(st);
          st.players[p].ink -= reward[0];
          if (reward[1] === 'draw') draw(st, p, reward[2]);
          else if (reward[1] === 'ink') gain(st.players[p], reward[2]);
          else
            push(
              st,
              ...Array.from({ length: reward[2] }, () => ({
                type: 'place',
                p,
                book: b.id,
                overflow: true,
              })),
            );
        },
      );
    skip();
  }
  if (j.type === 'subplot') {
    for (const id of j.eligible) {
      const c = pl.hand.find((x) => x.id === id);
      if (!c) continue;
      const d = content.subplots[c.design];
      for (const ongoing of [false, true]) {
        if (ongoing && owns(pl, c.design)) continue;
        add(`subplot:${id}:${ongoing}`, `${d.name}: ${ongoing ? d.ongoing : d.instant}`, (st) => {
          done(st);
          const card = st.players[p].hand.splice(
            st.players[p].hand.findIndex((x) => x.id === id),
            1,
          )[0];
          if (ongoing) st.players[p].ongoing.push(card.design);
          else {
            st.discard.push(card);
            const n = Number(d.instant.match(/\d+/)?.[0] ?? 0);
            if (d.instant.includes('ink')) gain(st.players[p], n);
            else draw(st, p, n);
          }
          note(st, `${pl.name} completes ${d.name}.`);
        });
      }
    }
    skip();
  }
  if (j.type === 'twist' && s.battle) {
    const bt = s.battle,
      bk = book(s, bt.book);
    if (bk.slots[j.k] !== p) {
      add('empty', 'Space no longer occupied: continue', done);
    } else {
      for (const c of pl.hand) {
        const cost = c.kind === 'subplot' ? 1 : has(pl, 3) ? 1 : content.twists[c.design].cost;
        if (pl.ink < cost) continue;
        add(
          `card:${c.id}`,
          `Pay ${cost} ink: ${c.kind === 'twist' ? content.twists[c.design].name : `${content.subplots[c.design].name} (+${has(pl, 4) ? 2 : 1} power)`}`,
          (st) => {
            const player = st.players[p],
              battle = st.battle!,
              bk = book(st, battle.book);
            player.ink -= cost;
            player.hand = player.hand.filter((x) => x.id !== c.id);
            battle.played.push(c);
            let n = has(player, 4) ? 2 : 1;
            if (c.kind === 'twist') {
              const d = c.design;
              n = [
                count(bk, p) === 1 ? 4 : 2,
                Math.min(5, 2 + bk.overflow[p]),
                allCount(st, p) >= 3 ? 6 : 4,
                player.figures.some((f) => f.primary && bid(f.page) === bk.id) ? 3 : 2,
                consecutive(bk, p) ? 5 : 3,
                st.players.some((_, i) => i !== p && count(bk, i) > count(bk, p)) ? 7 : 4,
                st.players.some((x, i) => i !== p && x.figures.some((f) => bid(f.page) === bk.id))
                  ? 3
                  : 2,
                pages(bk, p).length && bk.overflow[p] ? 5 : 3,
                player.ink === 0 ? 8 : 6,
              ][d];
            }
            battle.bonus[p] += n;
            const jj = st.jobs[0];
            jj.left--;
            if (jj.left === 0) done(st);
            if (
              !battle.ignored.includes(p) &&
              player.figures.some((f) => f.id === 4 && bid(f.page) === bk.id)
            ) {
              draw(st, p, 1);
              battle.ignored.push(p);
            }
            if (
              owns(player, 9) &&
              !battle.ignored.includes(p + 10) &&
              player.figures.some((f) => f.primary && bid(f.page) === bk.id)
            ) {
              battle.ignored.push(p + 10);
              push(st, { type: 'exchange', p });
            }
          },
        );
      }
      add('pass', 'Pass this Twist opportunity', done);
    }
  }
  if (j.type === 'hyde') {
    if (pl.ink)
      add('hyde', 'Pay 1 ink: Hyde gains +3 power', (st) => {
        done(st);
        st.players[p].ink--;
        st.battle!.bonus[p] += 3;
      });
    skip();
  }
  if (j.type === 'castle' && b) {
    for (const owner of b.slots.flatMap((v, k) => (v !== null && v !== p ? [k] : [])))
      add(`bump:${owner}`, `Push space ${owner + 1} into overflow`, (st) => {
        const bk = book(st, b.id);
        bk.overflow[bk.slots[owner]!]++;
        bk.slots[owner] = null;
        done(st);
      });
    skip();
  }
  if (j.type === 'laboratory' && b) {
    if (pl.supply)
      for (const c of pl.hand)
        add(
          `discard:${c.id}`,
          `Discard ${c.kind === 'twist' ? content.twists[c.design].name : content.subplots[c.design].name}: place 1 overflow Inkling`,
          (st) => {
            done(st);
            st.discard.push(
              st.players[p].hand.splice(
                st.players[p].hand.findIndex((x) => x.id === c.id),
                1,
              )[0],
            );
            push(st, { type: 'place', p, book: b.id, overflow: true });
          },
        );
    skip();
  }
  if (j.type === 'aeneas') {
    if (pl.ink)
      add('pay', 'Pay 1 ink: gather up to 2 page Inklings', (st) => {
        done(st);
        st.players[p].ink--;
        push(st, { type: 'transfer', p, to: j.to, mode: 'page', n: 2 });
      });
    skip();
  }
  if (j.type === 'transfer') {
    for (const bk of s.books.filter((x) => x.id !== j.to)) {
      if (j.mode === 'overflow' && bk.overflow[p])
        add(
          `transfer:${bk.id}`,
          `Move overflow Inkling from ${source.books[bk.id].title}`,
          (st) => {
            book(st, bk.id).overflow[p]--;
            book(st, j.to).overflow[p]++;
            if (--st.jobs[0].n === 0) done(st);
          },
        );
      if (j.mode === 'page')
        for (const k of pages(bk, p))
          add(
            `transfer:${bk.id}:${k}`,
            `Move space ${k + 1} from ${source.books[bk.id].title}`,
            (st) => {
              book(st, bk.id).slots[k] = null;
              book(st, j.to).overflow[p]++;
              if (--st.jobs[0].n === 0) done(st);
            },
          );
    }
    skip();
  }
  if (j.type === 'exchange') {
    for (const c of pl.hand)
      add(
        `exchange:${c.id}`,
        `Exchange ${c.kind === 'twist' ? content.twists[c.design].name : content.subplots[c.design].name}`,
        (st) => {
          done(st);
          st.discard.push(
            st.players[p].hand.splice(
              st.players[p].hand.findIndex((x) => x.id === c.id),
              1,
            )[0],
          );
          draw(st, p, 1);
        },
      );
    skip();
  }
  if (j.type === 'express') {
    for (const f of pl.figures.filter((x) => x.id !== j.char))
      for (const dest of neighbors(s, f.page))
        add(`express:${dest}`, `Move ${content.characters[f.id].name} one space`, (st) => {
          st.players[p].figures.find((x) => x.id === f.id)!.page = dest;
          done(st);
        });
    skip();
  }
  if (j.type === 'character') {
    add('character', 'Draw companion', (st) => {
      done(st);
      const id = st.characters.pop();
      if (id === undefined) return;
      const player = st.players[p];
      if (player.figures.length === 2) st.characters.unshift(player.figures.pop()!.id);
      player.figures.push({ id, page: player.figures[0].page, primary: false });
    });
  }
  if (j.type === 'publish') {
    for (const site of chapterSites(s))
      add(`publish:${site.q}:${site.r}`, `Place new book at ${site.q}, ${site.r}`, (st) => {
        done(st);
        newBook(st, st.stack.pop()!, site.q, site.r);
      });
  }
  if (j.type === 'evacuate') {
    let min = Infinity;
    const targets = s.books.filter((x) => {
      const d = Math.max(
        Math.abs(x.q - j.from.q),
        Math.abs(x.r - j.from.r),
        Math.abs(x.q + x.r - j.from.q - j.from.r),
      );
      min = Math.min(min, d);
      return true;
    });
    for (const bk of targets.filter(
      (x) =>
        Math.max(
          Math.abs(x.q - j.from.q),
          Math.abs(x.r - j.from.r),
          Math.abs(x.q + x.r - j.from.q - j.from.r),
        ) === min,
    ))
      for (let side = 0; side < 2; side++)
        add(
          `evacuate:${bk.id}:${side}`,
          `Move ${content.characters[j.char].name} to ${source.books[bk.id].title}, ${side ? 'right' : 'left'} page`,
          (st) => {
            st.players[p].figures.find((x) => x.id === j.char)!.page = bk.id * 2 + side;
            done(st);
          },
        );
  }
  if (j.type === 'compact') {
    add('compact', 'Suggest a compact layout closest to this orientation', (st) => {
      compact(st);
    });
    for (const bk of s.books) {
      const sites = new Map<string, { q: number; r: number }>();
      for (const other of s.books.filter((x) => x.id !== bk.id))
        for (const [dq, dr] of [
          [1, 0],
          [0, 1],
          [-1, 1],
          [-1, 0],
          [0, -1],
          [1, -1],
        ]) {
          const q = other.q + dq,
            r = other.r + dr;
          if (!s.books.some((x) => x.q === q && x.r === r)) sites.set(`${q}:${r}`, { q, r });
        }
      for (const site of sites.values())
        add(
          `rearrange:${bk.id}:${site.q}:${site.r}`,
          `Arrange ${source.books[bk.id].title} at ${site.q}, ${site.r}`,
          (st) => {
            Object.assign(book(st, bk.id), site);
          },
        );
    }
    if (
      !disconnected(s) &&
      s.books.every((bk) => s.books.filter((x) => adjacentBooks(bk, x)).length >= 2)
    )
      add('accept-layout', 'Accept layout: every book touches at least two others', done);
  }

  return out;
}
function compact(s: State) {
  const old = s.books.map((b) => ({ q: b.q, r: b.r }));
  const shapes = [
    [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: 1, r: 1 },
      { q: 2, r: 0 },
      { q: 0, r: 2 },
      { q: 2, r: 1 },
      { q: 1, r: 2 },
      { q: 2, r: 2 },
    ],
  ];
  let best = Infinity,
    layout = old;
  for (const shape of shapes) {
    for (const anchor of old) {
      for (let rot = 0; rot < 6; rot++) {
        const transformed = shape.slice(0, s.books.length).map((v) => {
          let q = v.q,
            r = v.r;
          for (let k = 0; k < rot; k++) [q, r] = [-r, q + r];
          return { q: q + anchor.q, r: r + anchor.r };
        });
        const permutations = (a: number[], rest: number[]) => {
          if (!rest.length) {
            const mapped = a.map((i) => transformed[i]);
            if (mapped.some((v) => mapped.filter((w) => adjacentBooks(v, w)).length < 2)) return;
            const score = mapped.reduce(
              (sum, v, i) =>
                sum +
                Math.max(
                  Math.abs(v.q - old[i].q),
                  Math.abs(v.r - old[i].r),
                  Math.abs(v.q + v.r - old[i].q - old[i].r),
                ),
              0,
            );
            if (score < best) {
              best = score;
              layout = mapped;
            }
            return;
          }
          for (const i of rest)
            permutations(
              [...a, i],
              rest.filter((x) => x !== i),
            );
        };
        permutations(
          [],
          transformed.map((_, i) => i),
        );
      }
    }
  }
  s.books.forEach((b, i) => Object.assign(b, layout[i]));
  note(s, 'The conflict winner closes the gap; every book touches at least two others.');
}
export function applyAction(s: State, key: string): State {
  const next = structuredClone(s);
  const action = legalActions(next).find((x) => x.key === key);
  if (!action) throw Error('Illegal or stale action');
  action.run(next);
  normalize(next);
  assertChapterState(next);
  return next;
}
export function actingPlayer(s: State) {
  return s.jobs[0]?.p ?? s.active;
}
export function playerView(s: State, p: number) {
  return {
    players: s.players.map((x, i) => ({
      ...x,
      hand: i === p ? x.hand : [],
      handCount: x.hand.length,
    })),
    books: s.books,
    active: s.active,
    turn: s.turn,
    winner: s.winner,
    log: s.log,
    battle: s.battle
      ? {
          book: s.battle.book,
          participants: s.battle.participants,
          power: s.players.map((_, i) => power(s, i, s.battle!.book)),
        }
      : null,
    actor: actingPlayer(s),
    phase: s.jobs[0]?.type,
    stackCount: s.stack.length,
    actions:
      p === actingPlayer(s)
        ? legalActions(structuredClone(s)).map(({ key, label }) => ({ key, label }))
        : [],
  };
}

function chapterSites(s: State) {
  const sites = publicationSites(s.books);
  if (sites.length) return sites;
  const out = new Map<string, { q: number; r: number }>();
  for (const b of s.books)
    for (const [dq, dr] of [
      [1, 0],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [0, -1],
      [1, -1],
    ]) {
      const q = b.q + dq,
        r = b.r + dr;
      if (!s.books.some((x) => x.q === q && x.r === r)) out.set(`${q}:${r}`, { q, r });
    }
  return [...out.values()];
}
export function assertChapterState(s: State) {
  for (let p = 0; p < s.players.length; p++) {
    const pl = s.players[p];
    if (pl.ink < 0 || pl.ink > capacity(pl)) throw Error('Invalid ink');
    if (
      pl.supply < 0 ||
      pl.supply +
        s.books.reduce((n, b) => n + b.slots.filter((x) => x === p).length + b.overflow[p], 0) !==
        12
    )
      throw Error('Inkling conservation failed');
    if (
      s.winner === null &&
      pl.figures.some((f) => !book(s, bid(f.page))) &&
      !s.jobs.some((j) => j.type === 'evacuate' && j.p === p)
    )
      throw Error('Character stranded outside map');
  }
  if (new Set(s.books.map((b) => `${b.q}:${b.r}`)).size !== s.books.length)
    throw Error('Books overlap');
}
