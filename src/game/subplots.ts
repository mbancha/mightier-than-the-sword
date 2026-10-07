import type { Book, Character } from './types';
import type { Row } from '../data/catalog';
import { adjacentBooks, bookOf } from './topology';
type Position = {
  players: { page: number; rows: Record<Row, number> }[];
  books: Book[];
  characters: Character[];
  battle: { book: number; participants: number[] } | null;
};
export type Placement = { book: number; slot: number | null; triggersConflict: boolean };
// Actual placement's immediate state, before earned effects or conflict cleanup.
export function placementFulfills(s: Position, p: number, id: number, e: Placement): boolean {
  const b = s.books[e.book],
    spot = e.slot === null ? null : b.slots[e.slot];
  const own = (book: Book) => book.slots.filter((x) => x.owner === p).length + book.overflow[p];
  const edge = (book: Book, side: number, last: boolean) => {
    const slots = book.slots.filter((x) => x.page === side);
    return (last ? slots.at(-1) : slots[0])?.owner === p;
  };
  if (id === 0 || id === 1) {
    if (!spot) return false;
    const pageSlots = b.slots.map((x, i) => ({ x, i })).filter(({ x }) => x.page === spot.page);
    const endpoint = id === 1 ? pageSlots.at(-1) : pageSlots[0];
    return (
      endpoint?.i === e.slot &&
      s.books.some(
        (other, i) =>
          i !== e.book &&
          adjacentBooks(b, other) &&
          [0, 1].some((side) => edge(other, side, id === 1)),
      )
    );
  }
  switch (id) {
    case 2:
      return b.slots[0].owner === p && b.slots.at(-1)!.owner === p;
    case 3:
      return s.books.filter((book) => own(book) > 0).length >= 3;
    case 4:
      return e.slot === null && own(b) >= 3 && b.slots.some((x) => x.owner === p);
    case 5:
      return (
        b.overflow[p] > 0 &&
        [0, 1].every((side) => b.slots.some((x) => x.page === side && x.owner === p))
      );
    case 6:
      return (
        e.slot === null &&
        s.books.some((other, i) => i !== e.book && adjacentBooks(b, other) && other.overflow[p] > 0)
      );
    case 7:
      return (
        !!spot?.memory && b.slots.filter((x) => x.page === spot.page && x.owner === p).length >= 2
      );
    case 8:
      return (
        !!spot?.memory && spot.memory.owner !== p && b.slots.some((x) => x.memory?.owner === p)
      );
    case 9:
      return (
        !!spot?.memory &&
        s.books.some(
          (other, i) => i !== e.book && other.slots.some((x) => x.owner === p && x.memory),
        )
      );
    case 10:
      return (
        !!spot && b.slots.filter((x) => x.page === spot.page && x.memory?.owner === p).length >= 1
      );
    case 11:
      return (
        e.triggersConflict &&
        bookOf(s.players[p].page) === e.book &&
        b.slots.some((x) => x.page !== s.players[p].page % 2 && x.memory?.owner === p)
      );
    case 12:
      return e.triggersConflict && own(b) >= 3;
    case 13:
      return e.triggersConflict && !!spot?.memory;
    case 14:
      return (
        e.triggersConflict &&
        s.books.filter((other, i) => i !== e.book && own(other) > 0).length >= 2
      );
    default:
      return false;
  }
}
// Private bot planning estimate. This cannot complete a card without a placement.
export function subplotScore(s: Position, p: number, id: number): number {
  let best = 0;
  s.books.forEach((b, book) => {
    for (const slot of [null, ...b.slots.flatMap((x, i) => (x.owner === p ? [i] : []))]) {
      const triggersConflict =
        b.slots.every((x) => x.owner !== null || x.neutral) ||
        (b.slots.filter((x) => x.owner === null && !x.neutral).length === 1 &&
          s.characters.some(
            (c) =>
              c.id === 5 &&
              (bookOf(c.page) === book || (c.other !== null && bookOf(c.other) === book)),
          ));
      if (placementFulfills(s, p, id, { book, slot, triggersConflict })) best = 1;
    }
  });
  return best;
}
