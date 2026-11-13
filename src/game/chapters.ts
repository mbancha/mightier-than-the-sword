import source from '../data/content.json';
import { makeRng, shuffled, type RngState } from '../kernel/rng';
import { adjacentBooks, publicationSites, initialHexes } from './topology';
import catalog from '../data/chapters-content.json';
export const content = {
  ...catalog,
  bookEffects: catalog.books,
  baseRules: [
    'Place a fresh Inkling to resolve its printed space. Moving an existing Inkling gives no reward.',
    '⚔ indicates a combat effect. [special ◇] resolves the book’s special effect.',
    'End a chapter at turn start if you have no ink. You may also end it at 1–3 ink.',
    'The first conflict awards the bookmark. The next conflict awards the book.',
  ],
};
export const edition = 'chapters-sheet-1';
export const bookmarkNames = catalog.bookmarks.map((mark) => mark.name);
export const bookmarkText = catalog.bookmarks.map((mark) => mark.effect);
export const bookSlots = (id: number) => content.books[id].spaces.length;
export const leftSlots = (id: number) => Math.ceil(bookSlots(id) / 2);
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
  hyde?: boolean;
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
    haunting: number[];
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
const pageSide = (b: Book, k: number) => (k < leftSlots(b.id) ? 0 : 1);
export const pageOf = (b: Book, k: number) => b.id * 2 + pageSide(b, k);
const has = (p: Player, n: number) => p.marks.includes(n);
const owns = (p: Player, n: number) => p.ongoing.includes(n);
const count = (b: Book, p: number) => b.slots.filter((x) => x === p).length + b.overflow[p];
const pages = (b: Book, p: number) => b.slots.flatMap((v, k) => (v === p ? [k] : []));
const allCount = (s: State, p: number) => s.books.filter((b) => count(b, p) > 0).length;
const consecutive = (b: Book, p: number) => b.slots.some((v, k) => v === p && b.slots[k + 1] === p);
export const capacity = (_p: Pick<Player, 'marks'>) => 7;
export const minimum = (p: Player) => 1 + Number(owns(p, 0));
export const cardCost = (p: Pick<Player, 'marks'>, c: Card) =>
  c.kind === 'subplot' ? 1 : Math.max(0, content.twists[c.design].cost - Number(p.marks.includes(3)));
export const subplotPower = (p: Pick<Player, 'marks'>, design: number) =>
  content.subplots[design].power + (p.marks.includes(4) ? 2 : 0);
const gain = (p: Player, n: number) =>
  (p.ink = Math.min(capacity(p), p.ink + n + (n > 0 && has(p, 2) ? 2 : 0)));
const note = (s: State, t: string) => {
  s.log.push(t);
  if (s.log.length > 100) s.log.shift();
};
function draw(s: State, p: number, n: number) {
  if (n > 0 && has(s.players[p], 1)) n++;
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
    slots: Array(bookSlots(id)).fill(null),
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
  if (names.length >= 4) initial.push(shuffled(rng, ids.filter((id) => !initial.includes(id)))[0]);
  const cards: Card[] = [];
  let serial = 0;
  for (const [kind, designs] of [['twist', content.twists], ['subplot', content.subplots]] as const)
    designs.forEach(({ quantity }, design) => {
      for (let k = 0; k < quantity; k++) cards.push({ id: serial++, kind, design });
    });
  const s: State = {
    edition,
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
      hyde: undefined,
    })),
    books: [],
    stack: shuffled(
      rng,
      [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !initial.includes(i)),
    ),
    marks: shuffled(rng, content.bookmarks.flatMap(({ quantity }, id) => Array<number>(quantity).fill(id))),
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
  const sites = [...initialHexes, { q: 1, r: 1 }];
  initial.forEach((id, i) => newBook(s, id, sites[i].q, sites[i].r));
  for (const p of s.players) if (p.figures[0].id === 8) p.hyde = shuffled(s.rng, [false, true])[0];
  s.players.forEach((_, p) => draw(s, p, 1));
  s.jobs.push({ type: 'start', p: 0 });
  return s;
}
function moveEffects(s: State, p: number, f: Figure, old: number) {
  const b = book(s, bid(f.page));
  const from = book(s, bid(old));
  const jobs: Job[] = [];
  if (f.id === 0 && from.id !== b.id && from.overflow[p])
    jobs.push({ type: 'transfer', p, from: from.id, to: b.id, n: from.overflow[p] });
  const eligible = subplotCandidates(s, p, 'move', b.id, null, f.page);
  if (eligible.length) jobs.push({ type: 'subplot', p, eligible });
  push(s, ...jobs);
}
function placeOverflow(s: State, p: number, b: Book, n: number) {
  const count = Math.min(n, s.players[p].supply);
  b.overflow[p] += count;
  s.players[p].supply -= count;
}
function placed(s: State, p: number, b: Book, k: number | null, repeats = 1) {
  if (k === null) b.overflow[p]++;
  else b.slots[k] = p;
  s.players[p].supply--;
  note(s, `${s.players[p].name} places an Inkling in ${source.books[b.id].title}.`);
  const eligible = subplotCandidates(s, p, 'place', b.id, k);
  push(s,
    ...(eligible.length ? [{ type: 'subplot', p, eligible, book: b.id }] : []),
    ...(k === null ? [] : Array.from({ length: repeats }, () => ({ type: 'reward', p, book: b.id, k }))),
    ...(k === b.slots.length - 1 && owns(s.players[p], 2) ? [{ type: 'lastInk', p }] : []),
    { type: 'check', p, book: b.id },
  );
}
function subplotCandidates(s: State, p: number, event: string, id: number, k: number | null, page?: number) {
  const b = book(s, id);
  const pl = s.players[p];
  const start = s.battle?.start;
  const adjacent = s.books.filter((other) => adjacentBooks(other, b));
  const around = page === undefined ? [] : neighbors(s, page);
  const eligible = [
    event === 'move' && around.length >= 2 && around.every((dest) =>
      pages(book(s, bid(dest)), p).some((slot) => pageOf(book(s, bid(dest)), slot) === dest)),
    event === 'place' && k !== null && neighbors(s, pageOf(b, k)).some((dest) =>
      pages(book(s, bid(dest)), p).some((slot) => pageOf(book(s, bid(dest)), slot) === dest))
      && pl.hand.some((c) => c.kind === 'twist'),
    event === 'place' && adjacent.filter((other) => count(other, p) > 0).length >= 2,
    event === 'conflict' && (start ? book(start, id) : b).overflow[p] === 0,
    event === 'place' && k === b.slots.length - 1 && pl.hand.length >= 3 && pl.ink >= 3,
  ];
  return pl.hand.filter((c) => c.kind === 'subplot' && eligible[c.design] &&
    (!start || start.players[p].hand.some((x) => x.id === c.id))).map((c) => c.id);
}
export function power(s: State, p: number, id: number) {
  const b = book(s, id),
    pl = s.players[p];
  let n =
    pages(b, p).length * (has(pl, 7) ? 3 : 1) +
    b.overflow[p] * (1 + (has(pl, 6) ? 2 : 0) + (id === 2 ? 1 : 0));
  for (const f of pl.figures.filter((f) => bid(f.page) === id)) {
    n += content.characters[f.id].power + (id === 4 ? 1 : 0) + (f.primary && has(pl, 0) ? 4 : 0) + Number(owns(pl, 3)) + (f.id === 8 && pl.hyde ? 3 : 0);
    if (
      f.id === 3 &&
      s.players.some((x, i) => i !== p && x.figures.some((y) => bid(y.page) === id))
    )
      n += 2;

  }
  if (owns(pl, 4) && s.books.every((other) => other.overflow[p] > 0)) n += 2;
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
    haunting: [],
  };
  const js: Job[] = [];
  if (id === 6 && b.slots[0] !== null) js.push({ type: 'castle', p: b.slots[0], book: id });
  for (const p of ps) {
    const creature = s.players[p].figures.find((f) => f.id === 7 && bid(f.page) === id);
    if (creature && pages(b, p).some((k) => pageOf(b, k) === creature.page))
      js.push({ type: 'creaturePower', p });
  }
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
  }
  if (disconnected(s))
    jobs.push({ type: 'compact', p: s.active, old: s.books.map((x) => ({ id: x.id, q: x.q, r: x.r })) });
  push(s, ...jobs);
}
function normalize(s: State) {
  let guard = 0;
  while (s.jobs.length && s.winner === null && guard++ < 200) {
    const j = s.jobs[0];
    if (j.type === 'check') {
      s.jobs.shift();
      const b = book(s, j.book);
      if (b && !s.battle && b.slots.every((x) => x !== null)) beginConflict(s, b.id);
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
        const eligible = subplotCandidates(s, p, 'conflict', b.id, null);
        return eligible.length ? [{ type: 'subplot', p, eligible, book: b.id }] : [];
      });
      for (const p of bt.participants) {
        if (p !== winner && has(s.players[p], 11)) gain(s.players[p], count(b, p) * 2);
      }
      for (const p of bt.haunting)
        for (const other of s.books.filter((other) => other.id !== b.id))
          js.push({ type: 'haunt', p, book: other.id });
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
      const flights: Job[] = s.players.flatMap((pl, p) =>
        pl.figures.some((f) => f.id === 5 && bid(f.page) === b.id)
          ? [{ type: 'flight', p, from: b.id, q: b.q, r: b.r }] : []);
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
      if (s.winner === null) push(s, ...flights);
    } else if (j.type === 'lastInk') {
      s.jobs.shift();
      gain(s.players[j.p], 2);
    } else if (j.type === 'reward') {
      s.jobs.shift();
      const b = book(s, j.book);
      if (b) for (const part of content.books[b.id].spaces[j.k].split(' + ')) {
        const n = Number(part.match(/\d+/)?.[0] ?? 0);
        if (part.endsWith(' ink]')) gain(s.players[j.p], n);
        else if (part.endsWith(' cards]')) draw(s, j.p, n);
        else if (part.endsWith(' overflow inklings]')) placeOverflow(s, j.p, b, n);
        else if (part === 'place book' && s.stack.length) push(s, { type: 'publish', p: j.p });
        else if (part === '[special ◇]') {
          if (b.id === 0) push(s, { type: 'transfer', p: j.p, to: b.id, n: 2 });
          if (b.id === 1) push(s, { type: 'express', p: j.p });
          if (b.id === 3) {
            draw(s, j.p, 1);
            push(s, { type: 'exchange', p: j.p });
          }
          if (b.id === 5)
            for (const other of s.books.filter((other) => adjacentBooks(b, other)))
              placeOverflow(s, j.p, other, 1);
          if (b.id === 8) push(s, { type: 'laboratory', p: j.p, book: b.id });
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
function inklingTargets(b: Book) {
  return [
    ...b.slots.flatMap((owner, k) => owner === null ? [] : [{ key: `page:${k}`, label: `space ${k + 1}` }]),
    ...b.overflow.flatMap((n, p) => n ? [{ key: `overflow:${p}`, label: `Player ${p + 1}'s overflow Inkling` }] : []),
  ];
}
function erase(s: State, b: Book, key: string) {
  const [kind, raw] = key.split(':');
  const k = Number(raw);
  if (kind === 'overflow') {
    b.overflow[k]--;
    s.players[k].supply++;
  } else {
    s.players[b.slots[k]!].supply++;
    b.slots[k] = null;
  }
}
function removeFromHand(s: State, p: number, id: number) {
  const hand = s.players[p].hand;
  s.discard.push(hand.splice(hand.findIndex((c) => c.id === id), 1)[0]);
}
function finishSubplot(s: State, p: number, c: Card, ongoing: boolean) {
  const pl = s.players[p];
  const d = content.subplots[c.design];
  if (ongoing) {
    pl.ongoing.push(c.design);
    pl.hand = pl.hand.filter((card) => card.id !== c.id);
  } else {
    removeFromHand(s, p, c.id);
    const n = Number(d.instant.match(/\d+/)?.[0] ?? 0);
    if (c.design === 4) for (const b of s.books) placeOverflow(s, p, b, 1);
    else if (d.instant.includes('ink')) gain(pl, n);
    else draw(s, p, n);
  }
}
function subplotCosts(s: State, p: number, job: Job, c: Card): Action[] {
  const pl = s.players[p];
  const d = content.subplots[c.design];
  const finish = (st: State, ongoing: boolean) => {
    st.jobs.shift();
    finishSubplot(st, p, c, ongoing);
    note(st, `${pl.name} completes ${d.name}.`);
  };
  const options = (key: string, cost: string, pay: (st: State) => void) =>
    [false, true].filter((ongoing) => !ongoing || !owns(pl, c.design)).map((ongoing) => ({
      key: `subplot:${c.id}:${key}:${ongoing}`,
      label: `${d.name} · ${cost} · ${ongoing ? d.ongoing : d.instant}`,
      run: (st: State) => { pay(st); finish(st, ongoing); },
    }));
  if (c.design === 1)
    return pl.hand.filter((card) => card.kind === 'twist').flatMap((card) =>
      options(String(card.id), `Discard ${content.twists[card.design].name}`, (st) => removeFromHand(st, p, card.id)));
  const near = s.books.filter((other) => adjacentBooks(other, book(s, job.book)) && count(other, p));
  const own = (b: Book) => [...pages(b, p).map((k) => `page:${k}`), ...(b.overflow[p] ? [`overflow:${p}`] : [])];
  return near.flatMap((a, i) => near.slice(i + 1).flatMap((b) =>
    own(a).flatMap((x) => own(b).flatMap((y) => options(
      `${a.id}:${x}:${b.id}:${y}`,
      `Erase one of your Inklings on ${source.books[a.id].title} and ${source.books[b.id].title} (${x}, ${y})`,
      (st) => { erase(st, book(st, a.id), x); erase(st, book(st, b.id), y); },
    )))));
}
function characterActions(s: State, p: number, add: (key: string, label: string, run: Action['run']) => void) {
  const pl = s.players[p];
  for (const f of pl.figures) {
    const cost = content.characters[f.id].cost;
    const token = `ability:${f.id}`;
    if (cost === null || pl.ink < cost || s.used.includes(token)) continue;
    const b = book(s, bid(f.page));
    const use = (st: State) => {
      st.players[p].ink -= cost;
      st.used.push(token);
    };
    if (f.id === 1 && pl.supply)
      for (const dest of s.books.filter((other) => !count(other, p)))
        dest.slots.forEach((v, k) => {
          if (v !== null) return;
          add(`ability:1:${dest.id}:${k}`, `${cost} ink · Fogg: place on ${source.books[dest.id].title}, space ${k + 1}`, (st) => {
            use(st);
            st.players[p].figures.find((figure) => figure.id === 1)!.page = pageOf(dest, k);
            if (!st.moving.includes(1)) st.moving.push(1);
            placed(st, p, book(st, dest.id), k, 2);
          });
        });
    if (f.id === 4 && s.players.filter((_, owner) => count(b, owner)).length >= 2)
      add('ability:4', `${cost} ink · Odysseus: start a conflict`, (st) => { use(st); beginConflict(st, b.id); });
    if (f.id === 6 && pl.supply) {
      const occupied = b.slots.flatMap((v, k) => v !== null && pageOf(b, k) === f.page ? [k] : []);
      if (occupied.length === 1)
        add('ability:6', `${cost} ink · Dracula: replace the Inkling on this page`, (st) => {
          use(st);
          const target = book(st, b.id);
          erase(st, target, `page:${occupied[0]}`);
          target.slots[occupied[0]] = p;
          st.players[p].supply--;
          const eligible = subplotCandidates(st, p, 'place', target.id, occupied[0]);
          push(st, ...(eligible.length ? [{ type: 'subplot', p, book: target.id, eligible }] : []),
            { type: 'check', p, book: target.id });
        });
    }
  }
}
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
    characterActions(s, p, add);
    for (const f of pl.figures) {
      if (s.moving.includes(f.id)) continue;
      const range = 1 + (has(pl, 9) ? 3 : 0) + Number(owns(pl, 1)) +
        (f.id === 2 ? 2 : 0) + (f.id === 8 && pl.hyde === false ? 1 : 0);
      for (const dest of reachable(s, f.page, range))
        add(
          `move:${f.id}:${dest}`,
          `Move ${content.characters[f.id].name} to ${source.books[bid(dest)].title}, ${dest % 2 ? 'right' : 'left'}`,
          (st) => {
            const figure = st.players[p].figures.find((x) => x.id === f.id)!,
              old = figure.page;
            figure.page = dest;
            st.moving.push(f.id);
            push(st, { type: 'route', p, char: f.id, origin: old });
          },
        );
    }
    if (pl.figures.every((f) => s.moving.includes(f.id) || !neighbors(s, f.page).length))
      for (const f of pl.figures)
        add(`source:${f.id}`, `Place from ${content.characters[f.id].name}`, (st) => {
          done(st);
          st.source = f.id;
          push(st, { type: 'place', p, char: f.id, normal: true, first: true });
        });
  }
  if (j.type === 'route') {
    const f = pl.figures.find((x) => x.id === j.char)!;
    const max = 1;
    if (pl.ink && s.extraMove < max)
      for (const dest of reachable(s, f.page, 1))
        add(
          `step:${dest}`,
          `1 ink: move ${content.characters[f.id].name} to ${source.books[bid(dest)].title}, ${dest % 2 ? 'right' : 'left'}`,
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
        for (const k of j.overflow ? [null] : ks.length ? ks : [null])
          add(
            `place:${k}`,
            `${paid ? '1 ink: ' : ''}Place ${k === null ? 'in overflow' : `in space ${k + 1}`} of ${source.books[target.id].title}`,
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
    const max = 1;
    if (pl.ink && pl.supply && s.extraPlace < max)
      add('extra', '1 ink: place an extra Inkling', (st) => {
        done(st);
        push(st, { type: 'place', p, char: j.char, normal: true, first: false });
      });
    add('end', 'Finish placement', (st) => {
      done(st);
      push(st, { type: 'finish', p });
    });
  }
  if (j.type === 'subplot') {
    for (const id of j.eligible) {
      const c = pl.hand.find((x) => x.id === id);
      if (!c) continue;
      const d = content.subplots[c.design];
      if (c.design === 1 || c.design === 2) {
        for (const action of subplotCosts(s, p, j, c)) out.push(action);
        continue;
      }
      for (const ongoing of [false, true]) {
        if (ongoing && owns(pl, c.design)) continue;
        add(`subplot:${id}:${ongoing}`, `${d.name}: ${ongoing ? d.ongoing : d.instant}`, (st) => {
          done(st);
          finishSubplot(st, p, c, ongoing);
          note(st, `${pl.name} completes ${d.name}.`);
        });
      }
    }
    skip();
  }
  if (j.type === 'twist' && !s.battle) add('empty', 'Continue after conflict', done);
  if (j.type === 'twist' && s.battle) {
    const bt = s.battle,
      bk = book(s, bt.book);
    if (bk.slots[j.k] !== p) {
      add('empty', 'Space no longer occupied: continue', done);
    } else {
      for (const c of pl.hand) {
        const cost = cardCost(pl, c);
        if (pl.ink < cost) continue;
        add(
          `card:${c.id}`,
          `${cost} ink: ${c.kind === 'twist' ? content.twists[c.design].name : `${content.subplots[c.design].name} (+${subplotPower(pl, c.design)} power)`}`,
          (st) => {
            const player = st.players[p],
              battle = st.battle!,
              bk = book(st, battle.book);
            player.ink -= cost;
            player.hand = player.hand.filter((x) => x.id !== c.id);
            battle.played.push(c);
            if (c.kind === 'subplot') battle.bonus[p] += subplotPower(player, c.design);
            else {
              const adjacent = st.books.filter((other) => adjacentBooks(other, bk));
              const points = [
                0,
                adjacent.some((other) => count(other, p) >= 2) ? 4 : 2,
                adjacent.filter((other) => count(other, p) > 0).length >= 2 ? 7 : 3,
                0,
                adjacent.every((other) => count(other, p) > 0) ? 4 : 2,
                player.hand.length >= 3 ? 7 : 5,
                1,
                bk.overflow[p] >= 2 ? 4 : 2,
                3,
              ][c.design];
              battle.bonus[p] += points;
              if (c.design === 0) gain(player, 3);
              if (c.design === 3 || c.design === 6) draw(st, p, c.design === 3 ? 3 : 1);
              if (c.design === 8) battle.haunting.push(p);
            }
            note(st, `${player.name} plays ${c.kind === 'twist' ? content.twists[c.design].name : content.subplots[c.design].name}.`);
            const jj = st.jobs[0];
            jj.left--;
            if (jj.left === 0) done(st);
          },
        );
      }
      if (pl.figures.some((f) => f.id === 8))
        add('flip-hyde', 'Flip the Jekyll / Hyde coin', (st) => {
          st.players[p].hyde = shuffled(st.rng, [false, true])[0];
          if (--st.jobs[0].left === 0) done(st);
        });
      add('pass', 'Pass this Twist opportunity', done);
    }
  }
  if (j.type === 'creaturePower') {
    const cost = content.characters[7].cost!;
    if (pl.ink >= cost) add('creature-power', '1 ink: add 4 power', (st) => {
      done(st);
      st.players[p].ink -= cost;
      st.battle!.bonus[p] += 4;
    });
    skip();
  }
  if (j.type === 'haunt' && b) {
    for (const target of inklingTargets(b))
      add(`haunt:${b.id}:${target.key}`, `Erase ${target.label} from ${source.books[b.id].title}`, (st) => {
        erase(st, book(st, b.id), target.key);
        done(st);
      });
    if (!out.length) skip();
  }
  if (j.type === 'flight') {
    for (const target of s.books.filter((other) => adjacentBooks(other, { q: j.q, r: j.r })))
      for (const side of [0, 1])
        add(`flight:${target.id}:${side}`, `Move Aeneas to ${source.books[target.id].title}, ${side ? 'right' : 'left'} page`, (st) => {
          st.players[p].figures.find((f) => f.id === 5)!.page = target.id * 2 + side;
          placeOverflow(st, p, book(st, target.id), 2);
          st.jobs = st.jobs.filter((job, index) => index !== 0 && !(job.type === 'evacuate' && job.p === p && job.char === 5));
        });
    if (!out.length) skip();
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
    if (pl.supply >= 3)
      for (const c of pl.hand)
        add(
          `discard:${c.id}`,
          `Discard ${c.kind === 'twist' ? content.twists[c.design].name : content.subplots[c.design].name}: place 3 overflow Inklings`,
          (st) => {
            done(st);
            st.discard.push(
              st.players[p].hand.splice(
                st.players[p].hand.findIndex((x) => x.id === c.id),
                1,
              )[0],
            );
            placeOverflow(st, p, book(st, b.id), 3);
          },
        );
    skip();
  }
  if (j.type === 'transfer') {
    const to = book(s, j.to);
    for (const from of s.books.filter((other) => other.id !== j.to &&
      (j.from !== undefined ? other.id === j.from : adjacentBooks(other, to)) && other.overflow[p]))
      add(`transfer:${from.id}`, `Move overflow Inkling from ${source.books[from.id].title}`, (st) => {
        book(st, from.id).overflow[p]--;
        book(st, j.to).overflow[p]++;
        if (--st.jobs[0].n === 0) done(st);
      });
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
    if (!out.length) skip();
  }
  if (j.type === 'express') {
    for (const f of pl.figures)
      for (const dest of neighbors(s, f.page))
        add(`express:${f.id}:${dest}`, `Move ${content.characters[f.id].name} to ${source.books[bid(dest)].title}, ${dest % 2 ? 'right' : 'left'} page`, (st) => {
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
      if (id === 8) player.hyde = shuffled(st.rng, [false, true])[0];
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
    nextBookmark: s.marks.at(-1) ?? null,
    publicPlays: s.battle?.played ?? [],
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
