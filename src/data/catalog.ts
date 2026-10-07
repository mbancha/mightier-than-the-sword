import raw from './content.json';
export const content = raw;
export const ROWS = ['curiosity', 'valor', 'insight', 'resolve'] as const;
export type Row = (typeof ROWS)[number];
export const CONFIG = raw.balance;
export const books = raw.books;
export const twists = raw.twists.map(([name, timing, text, quote, source, endPoints], id) => ({
  id,
  name: String(name),
  timing: String(timing),
  text: String(text),
  quote: String(quote),
  source: String(source),
  endPoints: Number(endPoints ?? 1),
}));
export const subplots = raw.subplots.map(([name, target, text, reward, endPoints], id) => ({
  id,
  name: String(name),
  target: Number(target),
  text: String(text),
  reward: String(reward),
  endPoints: Number(endPoints ?? 1),
}));
export const characters = raw.characters.map((c, id) => ({
  ...c,
  id,
  actions: c.actions as [number, string][],
  passive: c.passive as [string, string] | null,
  collection: 'collection' in c ? Number(c.collection) : 0,
}));
export const tokens = Object.entries(raw.tokens).flatMap(([act, items]) =>
  items.map(([name, text, back], i) => ({
    id: (+act - 1) * 5 + i,
    act: +act,
    name: String(name),
    text: String(text),
    back: String(back),
  })),
);
export const rowName = (row: Row) => String(raw.tracks[ROWS.indexOf(row)][1]);
export const rowIcon = (row: Row) =>
  ({ curiosity: 'pacing', valor: 'tension', insight: 'imagination', resolve: 'voice' })[row];

export const movementLimit = (level: number) => (level === 3 ? 5 : CONFIG.baseMove + level);
export const quillPower = (level: number, inklings: number) => (level === 3 ? 2 + inklings : level);
