import { subplotScore, placementFulfills } from './subplots';
import { characters, content, CONFIG, quillPower, type Row } from '../data/catalog';
import { reachable, bookOf, adjacentBooks } from './topology';
import type { playerView } from './views';
import type { Choice, Character } from './types';
export const BOT_VERSION = 'strategic-4';
type View = ReturnType<typeof playerView>;
// Heuristics only: no engine simulation, deck access or opponent hand access.
export function rankBotActions(v: View, decision: number) {
  const p = v.actor,
    me = v.players[p],
    bt = v.battle;
  const noise = (key: string) => {
    let h = (decision + 1) * 7919 + v.turn * 101 + p * 17;
    for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return ((h >>> 0) / 4294967296) * 0.8;
  };
  const at = (c: Character, b: number) =>
    bookOf(c.page) === b || (c.other !== null && bookOf(c.other) === b);
  const own = v.characters.filter((c) => c.owner === p);
  const inks = (b: number, owner = p) =>
    v.books[b].slots.filter((s) => s.owner === owner).length + v.books[b].overflow[owner];
  const cp = (c: Character) => (c.id === 1 && c.collected === 3 ? 5 : characters[c.id].power);
  const handSize = v.hand.length + (me.subplot === null ? 0 : 1);
  const drawValue = () => (handSize < CONFIG.baseHand + me.rows.insight ? 1.8 : 0.4);
  const forecast = (n: number) => {
    const available = v.act < 3 ? me.reserves[v.act] : 0,
      take = Math.min(n, available);
    return take * (me.supply < 2 ? 2 : 1.1) + (n - take);
  };
  const rowValue = (row: Row) => {
    const level = me.rows[row],
      time = (4 - v.act) / 2;
    return (
      {
        curiosity: level === 0 ? 2.2 : 0.6,
        valor: 1.8,
        insight: handSize >= CONFIG.baseHand + level ? 2.4 : 0.7,
        resolve: level === 1 ? 3.6 : level === 0 ? 2.5 : 1.7,
      }[row] * time
    );
  };
  const memoryValue = (row: Row, b: number) =>
    row === 'valor'
      ? 1
      : row === 'insight'
        ? drawValue()
        : row === 'resolve'
          ? forecast(1)
          : v.books[b].id === 0 || me.supply < 2
            ? 0
            : 1.7;
  const bestEnemy = (b: number) => Math.max(0, ...v.bookPowers[b].filter((_, i) => i !== p));
  const near = (b: number) =>
    1 -
    v.books[b].slots.filter((s) => s.owner === null && !s.neutral).length / v.books[b].slots.length;
  const influence = (b: number, added: number) => {
    const mine = v.bookPowers[b][p],
      enemy = bestEnemy(b);
    const gap = enemy - mine;
    return added * 0.5 + (gap >= 0 && added > gap ? 2.5 : 0) * (0.3 + near(b));
  };
  const placement = (b: number, k: number | null) => {
    if (k === null)
      return v.books[b].id === 0 ? -9 : 1.6 + influence(b, v.books[b].id === 2 ? 2 : 1);
    const book = v.books[b],
      spot = book.slots[k];
    let n = 3 + influence(b, 1);
    if (book.id === 6 && k === 0) n += 1.5;
    if (book.id === 1) n += 0.7;
    if (book.id === 5) n -= 0.7;
    if (spot.memory) n += memoryValue(spot.memory.row, b) - (spot.memory.owner !== p ? 0.6 : 0);
    const empty = book.slots.filter((s) => s.owner === null && !s.neutral).length;
    if (empty === 1 || (empty === 2 && v.characters.some((c) => c.id === 5 && at(c, b)))) {
      const mine = v.bookPowers[b][p] + 1;
      n += mine > bestEnemy(b) ? 5 + (!book.covered ? v.act : 0) : -2;
    }
    return n;
  };
  const pageValue = (page: number) => {
    const b = bookOf(page),
      book = v.books[b];
    const spots = book.slots.flatMap((s, k) =>
      s.page === page % 2 && s.owner === null && !s.neutral ? [placement(b, k)] : [],
    );
    const upgradable = book.slots.some((s) => s.page === page % 2 && s.owner === p && !s.memory);
    return (
      Math.max(...spots, placement(b, null), upgradable ? 3 : -10) + (book.covered ? 0 : 0.5) + 0
    );
  };
  const enemiesOnPage = (page: number) =>
    v.books[bookOf(page)].slots.filter(
      (s) => s.page === page % 2 && s.owner !== null && s.owner !== p,
    ).length + v.books[bookOf(page)].overflow.reduce((n, x, i) => n + (i === p ? 0 : x), 0);
  const charDestination = (c: Character, page: number) => {
    const b = bookOf(page);
    let n = influence(b, cp(c)) + near(b) * 2 + (inks(b) ? 1.5 : 0);
    if (c.id === 0) n += enemiesOnPage(page) ? 3 + (me.supply > 0 ? 1 : 0) : 0;
    if (c.id === 2) n += v.books[b].id !== 0 && me.supply > 0 ? 1 : -2;
    if (c.id === 4) n += !me.horseSpent ? near(b) * 3 : -2;
    if (c.id === 5 && v.books[b].slots.filter((s) => s.owner === null && !s.neutral).length === 1)
      n += v.bookPowers[b][p] + (at(c, b) ? 0 : cp(c)) > bestEnemy(b) ? 6 : -6;
    if (c.id === 6) n += inks(b) && v.hand.length ? 2.5 : 0;
    if (c.id === 7) n += v.books[b].id === 0 ? -4 : Math.min(3, c.used[0] + 1) * (0.5 + near(b));
    return n;
  };
  const activation = (id: number, action: number) => {
    const c = own.find((c) => c.id === id)!;
    if (id === 3 && action === 1) return enemiesOnPage(c.page) ? 5 : -8;
    if (id === 9) return 3 + (c.other === null ? 2 : 0);
    const range = id === 0 || id === 2 || id === 3 ? 1 : id === 6 ? 3 : 2;
    const pages =
      id === 7 || id === 8
        ? v.books.flatMap((_, b) => [b * 2, b * 2 + 1])
        : reachable(v.books, c.page, range);
    const best = Math.max(...pages.map((page) => charDestination(c, page)));
    let n = 1 + best - charDestination(c, c.page);
    if (id === 0) n += pages.some((page) => enemiesOnPage(page)) ? 5 : -4;
    if (id === 2)
      n +=
        0.5 * (me.supply > 1 && v.books[bookOf(c.page)].id !== 0 ? 4 : 0) +
        (enemiesOnPage(c.page) ? 1.5 : 0);
    if (id === 7) n += near(bookOf(c.page)) * 3;
    if (id === 8) n += Math.max(...pages.map(pageValue)) - pageValue(me.page);
    return n;
  };
  const effectsValue = (effects: { type: string; n?: number }[]) =>
    effects.reduce(
      (sum, e) =>
        sum +
        (e.type === 'points'
          ? e.n!
          : e.type === 'foreshadow'
            ? forecast(e.n!)
            : e.type === 'draw'
              ? drawValue() * e.n!
              : e.type === 'gain'
                ? v.deckCounts.character
                  ? 2 + (4 - v.act) * 1.5
                  : 2
                : e.type === 'refresh'
                  ? Math.min(
                      e.n!,
                      own.reduce((n, c) => n + c.used.reduce((a, b) => a + b, 0), 0),
                    ) * 1.5
                  : e.type === 'upgrade'
                    ? 2.8
                    : e.type === 'place'
                      ? Math.min(me.supply, e.n!) * 1.3
                      : 0),
      0,
    );
  const twistValue = (id: number) => {
    if (!bt) return [4, 5, 3, 3, 3, 2, 3, 4, 2, 2, 4, 4, 2, 4, 3][id];
    const b = bt.book,
      chars = own.filter((c) => at(c, b)),
      rivalChars = v.characters.filter((c) => c.owner !== p && at(c, b));
    let gain = id < 8 ? CONFIG.twistPower[id] : id === 8 ? 2 : id === 11 || id === 14 ? 3 : 0;
    let extra = 0;
    if (id === 0 && chars.length) gain += CONFIG.heroCharacterBonus;
    if (id === 2 && inks(b) === 1) gain = CONFIG.travellingSoloPower;
    if (id === 3 || id === 9)
      gain +=
        v.books[b].id === 0
          ? 0
          : Math.min(
              id === 3 ? 2 : 3,
              v.books.reduce((n, _, bi) => n + (bi !== b ? inks(bi) : 0), 0),
            );
    if (id === 4) gain += Math.max(0, ...rivalChars.map(cp));
    if (id === 5) gain += Math.min(2, inks(b)) * 2;
    if (id === 7 && bt.powers[p] + gain > Math.max(...bt.powers.filter((_, i) => i !== p)))
      extra += 2;
    if (id === 8 && bookOf(me.page) !== b) gain += quillPower(me.rows.valor, inks(b));
    if (id === 10) {
      gain +=
        v.books[b].id === 0 ? 0 : Math.min(2, me.supply + (v.act < 3 ? me.reserves[v.act] : 0));
      extra += forecast(2);
    }
    if (id === 11) extra += 2;
    if (id === 12) extra += v.deckCounts.character ? 2 + (4 - v.act) : 0;
    if (id === 13 && v.books[b].slots.some((s) => s.owner !== null && s.owner !== p)) {
      gain += me.supply ? 2 : 1;
    }
    if (id === 14)
      extra +=
        Math.min(
          2,
          own.reduce((n, c) => n + c.used.reduce((a, b) => a + b, 0), 0),
        ) * 1.5;
    const leader = bt.participants.reduce((a, i) => (bt.powers[i] > bt.powers[a] ? i : a));
    const rival = Math.max(0, ...bt.participants.filter((i) => i !== p).map((i) => bt.powers[i]));
    const wins = bt.participants.every(
      (i) =>
        i === p ||
        bt.powers[p] + gain > bt.powers[i] ||
        (bt.powers[p] + gain === bt.powers[i] &&
          bt.participants.indexOf(p) < bt.participants.indexOf(i)),
    );
    const replenishes = chars.some((c) => c.id === 6) && !bt.allIgnored;
    return (
      extra +
      (leader !== p && wins
        ? 9
        : leader !== p
          ? Math.min(gain, 3) * 0.35
          : bt.powers[p] - rival < 2
            ? gain * 0.35
            : 0) -
      (replenishes ? 0.3 : 2.2)
    );
  };
  const score = (a: Choice) => {
    const parts = a.key.split(':');
    if (parts[0] === 'turn' && parts[1] === 'upgrade') parts.shift();
    const [kind, x, y, z] = parts;
    let n = noise(a.key);
    if (me.subplot !== null) {
      const projected = {
        players: v.players.map((pl) => ({ ...pl, rows: { ...pl.rows } })),
        books: structuredClone(v.books),
        characters: structuredClone(v.characters),
        battle: v.battle,
      };
      let changed = false;
      if ((kind === 'memoryHere' || kind === 'upgrade') && x !== undefined) {
        projected.books[+x].slots[+y].memory = { owner: p, row: z as Row };
        projected.books[+x].slots[+y].owner = null;
        projected.players[p].rows[z as Row]++;
        changed = true;
      }
      if (kind === 'page') {
        if (v.moving?.character === null || v.moving?.character === undefined)
          projected.players[p].page = +x;
        else projected.characters.find((c) => c.id === v.moving!.character)!.page = +x;
        changed = true;
      }
      if (
        (kind === 'placeHere' || kind === 'place') &&
        x !== undefined &&
        x !== 'null' &&
        a.book !== undefined
      ) {
        projected.books[a.book].slots[+x].owner = p;
        if (projected.books[a.book].slots.every((slot) => slot.owner !== null))
          projected.battle = {
            ...(v.battle ?? {
              allIgnored: false,
              powers: [],
              winner: null,
              space: 0,
              spaceOwner: null,
              spacePlayed: 0,
            }),
            book: a.book,
            participants: [p],
          };
        changed = true;
      }
      if (changed && (kind === 'page' || kind === 'upgrade' || kind === 'memoryHere')) {
        n += (subplotScore(projected, p, me.subplot) - subplotScore(v, p, me.subplot)) * 3;
      }
      if (
        ['placeHere', 'place', 'adjacent', 'publishOverflow', 'bindingRedirect'].includes(kind) &&
        a.book !== undefined &&
        x !== undefined
      ) {
        const slotText = kind === 'adjacent' ? a.key.split(':').at(-1)! : x;
        const slot =
          ['publishOverflow', 'bindingRedirect'].includes(kind) || slotText === 'null'
            ? null
            : Number(slotText);
        const b = structuredClone(v.books);
        if (slot === null) b[a.book].overflow[p]++;
        else b[a.book].slots[slot].owner = p;
        const empty = b[a.book].slots.filter((s) => s.owner === null && !s.neutral).length;
        const triggersConflict =
          slot !== null &&
          (empty === 0 ||
            (empty === 1 && v.characters.some((c) => c.id === 5 && at(c, a.book!)))) &&
          v.battle?.book !== a.book;
        if (
          placementFulfills({ ...projected, books: b }, p, me.subplot, {
            book: a.book,
            slot,
            triggersConflict,
          })
        )
          n += 20;
      }
    }

    if (kind === 'step' || kind === 'endMove') return -100 + n; // final destination choices avoid movement loops
    if (kind === 'skip' || kind === 'pass') return n;
    if (kind === 'finish') return 1 + n;
    if (kind === 'page') {
      const c =
        v.moving?.character === null || v.moving?.character === undefined
          ? null
          : own.find((c) => c.id === v.moving!.character);
      n += c ? charDestination(c, +x) : pageValue(+x);
      const from = c?.page ?? me.page;
      if (v.books[bookOf(from)].id === 3 && bookOf(+x) !== bookOf(from)) n += 1;
    }
    if (kind === 'placeHere' || kind === 'place') {
      if (x === undefined)
        n +=
          Math.max(
            ...v.actions
              .filter((a) => a.key.startsWith('placeHere:'))
              .map((a) =>
                placement(a.book!, a.key.endsWith(':null') ? null : +a.key.split(':')[1]),
              ),
            -5,
          ) - 0.1;
      else n += placement(a.book!, x === 'null' ? null : +x);
    }
    if (kind === 'memoryHere' || kind === 'upgrade') {
      if (x === undefined)
        n -= 10; // direct memory choices carry full information
      else {
        const row = z as Row,
          book = v.books[+x];
        n += 1.7 + rowValue(row) - (me.supply < 2 ? 0.8 : 0);
        if (bt?.book === +x) n -= 1.8;
      }
    }
    if (kind === 'memoryBonus')
      n += memoryValue(
        v.books[v.effect.book!].slots.find((s) => s.owner === p && s.memory)?.memory?.row ??
          'valor',
        v.effect.book!,
      );
    if (kind === 'forcedConflict') n += +x === +x ? influence(+x, 0) : 0;
    if (kind === 'memoryActivate') n += activation(+x, +y) + 1;
    if (kind === 'activate') n += activation(+x, +y);
    if (kind === 'twist') n += twistValue(+x);
    if (kind === 'boost') n += me.supply >= 2 ? pageValue(me.page) - twistValue(+x) * 0.4 : -10;
    if (kind === 'discard') n -= twistValue(+x);
    if (kind === 'discardSubplot')
      n -= 6 + (me.subplot === null ? 0 : subplotScore(v, p, me.subplot) * 4);
    if (kind === 'resolveOption') n += +x === 3 ? 5 : +x === 2 ? 4 : +x === 1 ? 2 : 1;
    if (kind === 'adjacent')
      n += placement(a.book!, a.key.endsWith(':null') ? null : +a.key.split(':').at(-1)!);
    if (kind === 'insightTwist') n += drawValue();
    if (kind === 'insightSubplot') n += 5;
    if (kind === 'bookMove') n += 1;
    if (kind === 'character') n += effectsValue([{ type: 'gain' }]);
    if (kind === 'alternative' && me.subplot !== null)
      n += effectsValue(content.subplotEffects[me.subplot]);
    if (kind === 'token') n += v.tokenStrong[+x] ? 20 : 1;
    if (kind === 'reward') n += effectsValue(content.tokenEffects[+x]);
    if (kind === 'foreshadow') n += forecast(1);
    if (kind === 'refresh') n += 3 + (me.supply < 2 ? 2 : 0);
    if (kind === 'nemo') n += +x * (bt && v.books[bt.book].id === 0 ? -3 : 2);
    if (kind === 'ignore') n += cp(v.characters.find((c) => c.id === +x)!) * 2;
    if (kind === 'memory') n += 3 - rowValue(v.books[a.book!].slots[+x].memory!.row);
    if (kind === 'collect') {
      const c = own.find((c) => c.id === 1)!;
      n += c.collected === 2 ? 6 : me.supply <= 1 ? -1 : 1;
    }
    if (kind === 'target') {
      const b = +x,
        k = y === 'null' ? null : +y,
        owner = +z;
      if (v.prompt === 'transfer')
        n +=
          v.effect.book !== null && v.books[v.effect.book].id !== 0
            ? 3 - near(b) - (k !== null && v.books[b].slots[k].memory?.owner === p ? 1 : 0)
            : -3;
      else if (owner !== p)
        n +=
          3 +
          0 +
          (bt?.book === b &&
          owner === bt.participants.reduce((a, i) => (bt.powers[i] > bt.powers[a] ? i : a))
            ? 2
            : 0) +
          (v.effect.source === 'replace' && me.supply ? placement(b, k) : 0);
      else
        n +=
          v.effect.source === 'experiment' ? 1.5 - (k !== null && bt && k > bt.space ? 2 : 0) : -2;
    }
    if (kind === 'publishOverflow') n += placement(a.book!, null);
    if (kind === 'publish')
      n +=
        v.books.reduce(
          (total, b, i) =>
            total + (adjacentBooks(b, { q: a.q!, r: a.r! }) ? Math.max(0, placement(i, null)) : 0),
          0,
        ) * 0.3;
    if (kind === 'bridge')
      n +=
        influence(bookOf(+x), 2) + influence(bookOf(+y), 2) + near(bookOf(+x)) + near(bookOf(+y));
    if (kind === 'horse')
      n +=
        +x === 0
          ? Math.min(me.supply, 3)
          : +x === 1
            ? v.hand.length
            : +x === 2
              ? 3
              : +x === 3
                ? me.subplot !== null
                  ? 1 - subplotScore(v, p, me.subplot)
                  : 0
                : v.characters.filter((c) => c.owner !== p).reduce((n, c) => n + cp(c), 0) * 0.5;
    return n;
  };
  return v.actions
    .map((action) => ({ action, score: score(action) }))
    .sort((a, b) => b.score - a.score);
}
export function chooseBotAction(view: View, decision: number): Choice {
  const best = rankBotActions(view, decision)[0];
  if (!best) throw Error('Bot has no legal choices');
  return best.action;
}
