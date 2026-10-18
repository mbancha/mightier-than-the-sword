import type { playerView } from './chapters';
type View = ReturnType<typeof playerView>;
// Deliberately receives the same allowlisted view as a human seat.
export function chooseChapterAction(v: View): string | undefined {
  const a = v.actions,
    actor = v.actor,
    p = v.players[actor];
  if (!a.length) return;
  const exact = (key: string) => a.find((x) => x.key === key)?.key;
  if (v.phase === 'compact') return exact('accept-layout') ?? exact('compact');
  if (v.phase === 'route') return exact('arrive');
  if (v.phase === 'afterPlace') return exact('extra') ?? exact('creature') ?? exact('end');
  if (v.phase === 'start')
    return (p.ink <= 1 ? exact('chapter') : undefined) ?? exact('turn') ?? a[0].key;
  if (v.phase === 'movement') {
    const sources = a.filter((x) => x.key.startsWith('source:'));
    if (sources.length) return sources[0].key;
    const moves = a.filter((x) => x.key.startsWith('move:'));
    moves.sort((x, y) => {
      const score = (key: string) => {
        const dest = Number(key.split(':')[2]);
        const b = v.books.find((x) => x.id === Math.floor(dest / 2));
        return b
          ? b.slots.filter((x) => x !== null).length * 2 + (b.contested ? 3 : 0) + b.overflow[actor]
          : 0;
      };
      return score(y.key) - score(x.key);
    });
    return moves[0]?.key ?? a[0].key;
  }
  if (v.phase === 'twist') return a.find((x) => x.key.startsWith('card:'))?.key ?? exact('pass');
  if (v.phase === 'subplot')
    return a.find((x) => x.key.endsWith(p.ink <= 2 ? ':false' : ':true'))?.key ?? exact('skip');
  return a.find((x) => !['skip', 'pass'].includes(x.key))?.key ?? a[0].key;
}
