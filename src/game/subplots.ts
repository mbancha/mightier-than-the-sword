import type { Book, Character } from './types';
import type { Row } from '../data/catalog';

// Current-board predicates shared by the engine and private-view bot heuristics.
// Fractions help bots plan; they are never counters, persisted, or shown publicly.
type Position = {
  players: { page: number; rows: Record<Row, number> }[];
  books: Book[];
  characters: Character[];
  battle: { book: number; participants: number[] } | null;
};
export function subplotScore(s: Position, p: number, id: number): number {
  const me = s.players[p],
    here = Math.floor(me.page / 2);
  const memories = s.books.map((b) => b.slots.filter((x) => x.memory?.owner === p));
  const capped = (n: number, goal: number) => Math.min(n / goal, 1);
  const best = (values: number[]) => Math.max(0, ...values);
  const combat = (row: Row) =>
    s.battle !== null &&
    s.battle.participants.includes(p) &&
    memories[s.battle.book].some((x) => x.memory!.row === row);
  switch (id) {
    case 0:
      return (
        (capped(memories.filter((m) => m.length).length, 3) * 3 +
          Number(memories[here].length > 0)) /
        4
      );
    case 1:
      return capped(Object.values(me.rows).filter((n) => n > 0).length, 3);
    case 2:
      return best(
        memories.map(
          (m, b) =>
            (new Set(m.map((x) => x.page)).size +
              Number(
                here === b ||
                  s.characters.some(
                    (c) =>
                      c.owner === p &&
                      (Math.floor(c.page / 2) === b ||
                        (c.other !== null && Math.floor(c.other / 2) === b)),
                  ),
              )) /
            3,
        ),
      );
    case 3:
      return best(
        memories.flatMap((m, b) =>
          [0, 1].map(
            (page) =>
              (capped(new Set(m.filter((x) => x.page === page).map((x) => x.memory!.row)).size, 2) *
                2 +
                Number(me.page === b * 2 + page)) /
              3,
          ),
        ),
      );
    case 4:
      return (capped(me.rows.resolve, 2) * 2 + capped(me.rows.curiosity, 1)) / 3;
    case 5:
      return best(
        memories.map(
          (m) =>
            (capped(m.length, 2) * 2 + Number(m.some((x) => x.owner !== null && x.owner !== p))) /
            3,
        ),
      );
    case 6:
      return (capped(me.rows.insight, 2) * 2 + Number(combat('insight'))) / 3;
    case 7:
      return (Number(me.rows.valor > 0) + Number(combat('valor') && s.battle!.book === here)) / 2;
    case 8:
      return best(
        s.books.map(
          (b) =>
            (Number(b.slots[0].memory?.owner === p) + Number(b.slots.at(-1)!.memory?.owner === p)) /
            2,
        ),
      );
    case 9:
      return best(
        memories.map(
          (m) =>
            (capped(new Set(m.map((x) => x.memory!.row)).size, 2) * 2 +
              Number(m.some((x) => x.owner === p))) /
            3,
        ),
      );
    default:
      return 0;
  }
}
