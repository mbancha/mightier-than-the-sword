// Axial hex coordinates; books retain stable insertion IDs as the map grows.
export interface Hex {
  q: number;
  r: number;
}
export const bookOf = (page: number) => Math.floor(page / 2);
export const pageSide = (page: number) => (page % 2 === 0 ? 'left' : 'right');
export const directions: Hex[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];
export const initialHexes: Hex[] = [
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 0, r: 1 },
];
export const hexKey = (h: Hex) => `${h.q},${h.r}`;
export const adjacentBooks = (a: Hex, b: Hex) =>
  directions.some((d) => a.q + d.q === b.q && a.r + d.r === b.r);
export function publicationSites(map: Hex[]): Hex[] {
  const occupied = new Set(map.map(hexKey)),
    candidates = new Map<string, Hex>();
  for (const h of map)
    for (const d of directions) {
      const v = { q: h.q + d.q, r: h.r + d.r };
      if (!occupied.has(hexKey(v)) && map.filter((b) => adjacentBooks(b, v)).length >= 2)
        candidates.set(hexKey(v), v);
    }
  return [...candidates.values()].sort((a, b) => a.r - b.r || a.q - b.q);
}
export function pageNeighbors(map: Hex[], page: number): number[] {
  const b = bookOf(page),
    side = page % 2;
  if (!map[b]) return [];
  const result = [b * 2 + 1 - side];
  map.forEach((other, i) => {
    if (!adjacentBooks(map[b], other)) return;
    const dx = other.q - map[b].q + (other.r - map[b].r) / 2;
    if (side === (dx > 0 ? 1 : 0)) result.push(i * 2 + (dx > 0 ? 0 : 1));
  });
  return result;
}
export function distance(map: Hex[], a: number, b: number): number {
  if (!map[bookOf(a)] || !map[bookOf(b)]) return Infinity;
  const seen = new Set([a]),
    todo = [{ p: a, n: 0 }];
  for (let i = 0; i < todo.length; i++) {
    const { p, n } = todo[i];
    if (p === b) return n;
    for (const next of pageNeighbors(map, p))
      if (!seen.has(next)) {
        seen.add(next);
        todo.push({ p: next, n: n + 1 });
      }
  }
  return Infinity;
}
export const reachable = (map: Hex[], page: number, range: number) =>
  Array.from({ length: map.length * 2 }, (_, i) => i).filter(
    (i) => distance(map, page, i) <= range,
  );
