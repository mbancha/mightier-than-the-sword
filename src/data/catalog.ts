import raw from './content.json';
export const content = raw;
export const ROWS = ['curiosity', 'valor', 'insight', 'resolve'] as const;
export type Row = (typeof ROWS)[number];
export const CONFIG = raw.balance;
export const books = raw.books;
export const twists = raw.twists.map(([name, timing, text, quote, source], id) => ({
  id,
  name,
  timing,
  text,
  quote,
  source,
}));
export const subplots = raw.subplots.map(([name, target, text, reward], id) => ({
  id,
  name: String(name),
  target: Number(target),
  text: String(text),
  reward: String(reward),
}));
export const characters = raw.characters.map((c, id) => ({
  ...c,
  id,
  actions: c.actions as [number, string][],
  passive: c.passive as [string, string] | null,
  collection: 'collection' in c ? Number(c.collection) : 0,
}));
export const tokens = Object.entries(raw.tokens).flatMap(([act, items]) =>
  items.map(([name, text], i) => ({ id: (+act - 1) * 5 + i, act: +act, name, text })),
);
export const rowName = (row: Row) => row[0].toUpperCase() + row.slice(1);

export const movementLimit = (level: number) => (level === 3 ? 5 : CONFIG.baseMove + level);
export const quillPower = (level: number, inklings: number) => (level === 3 ? 2 + inklings : level);
