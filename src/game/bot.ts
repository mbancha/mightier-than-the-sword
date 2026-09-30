import type { playerView } from './views';
import type { Choice } from './types';
// Bots see exactly one player's projection: never decks or opponents' hands.
export function chooseBotAction(view: ReturnType<typeof playerView>, decision: number): Choice {
  const p = view.actor,
    me = view.players[p];
  const noise = (key: string) => {
    let h = (decision + 1) * 7919 + view.turn * 101 + p * 17;
    for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0) / 4294967296;
  };
  const score = (a: Choice) => {
    let n = noise(a.key) * 3;
    if (a.key.startsWith('step:') || a.key === 'endMove') return -100 + n;
    if (a.key === 'skip' || a.key === 'pass') n -= 2;
    if (a.key === 'place') n += 6;
    if (a.key === 'upgrade') n += noise('memory') > 0.65 ? 8 : 1;
    if (a.key === 'finish') n += 8;
    if (a.key.startsWith('twist:'))
      n += view.prompt === 'battle' ? 5 : noise('twist') > 0.55 ? 10 : 0;
    if (a.key.startsWith('activate:')) n += noise('character') > 0.65 ? 8 : 2;
    if (a.key.startsWith('page:') && a.page !== undefined) {
      const b = view.books[Math.floor(a.page / 2)];
      const spaces = b.slots.filter((s) => s.page === a.page! % 2 && s.owner === null);
      n += spaces.length ? 5 : -3;
      n += b.slots.filter((s) => s.owner === p).length * 1.2;
      if (b.covered) n -= 1;
    }
    if (a.key.startsWith('upgrade:') && a.key.endsWith(':resolve')) n += 2;
    if (a.key.startsWith('publishOverflow:') && a.book !== undefined && view.books[a.book].id === 0)
      n -= 20;
    if (a.key.startsWith('place:') && a.key !== 'place:null') n += 5;
    if (a.key === 'collect' || a.key === 'foreshadow') n += 4;
    if (a.key.startsWith('subplot:') && me.supply < 2) n += noise('reward') * 2;
    return n;
  };
  if (!view.actions.length) throw Error('Bot has no legal choices');
  return [...view.actions].sort((a, b) => score(b) - score(a))[0];
}
