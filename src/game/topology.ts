// A 3 by 3 array of books is a 6 by 3 array of pages. No CSS coordinates in rules.
export const bookOf = (page: number) => Math.floor(page / 2);
export function position(page: number) {
  const b = bookOf(page);
  return { x: (b % 3) * 2 + (page % 2), y: Math.floor(b / 3) };
}
export function distance(a: number, b: number) {
  const x = position(a),
    y = position(b);
  return Math.abs(x.x - y.x) + Math.abs(x.y - y.y);
}
export const reachable = (page: number, range: number) =>
  Array.from({ length: 18 }, (_, i) => i).filter((i) => distance(page, i) <= range);
export const pageSide = (page: number) => (page % 2 === 0 ? 'left' : 'right');
