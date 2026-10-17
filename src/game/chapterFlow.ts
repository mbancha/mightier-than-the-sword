import { applyAction, legalActions, actingPlayer, playerView, type State } from './chapters';
export interface FlowChoice {
  key: string;
  label: string;
  path: string[];
  page?: number;
}
// Collapse administrative steps only. Never auto-spend or skip an optional reward.
export function settleFlow(input: State): State {
  let s = structuredClone(input);
  for (let n = 0; n < 100 && s.winner === null; n++) {
    const a = legalActions(s),
      j = s.jobs[0];
    if (!j || s.players[j.p].bot) break;
    const automatic =
      a.length === 1 &&
      (a[0].key === 'turn' ||
        a[0].key.startsWith('source:') ||
        ['skip', 'end', 'arrive', 'empty', 'lost', 'character'].includes(a[0].key));
    if (!automatic) break;
    s = applyAction(s, a[0].key);
  }
  return s;
}
export function flowChoices(input: State): FlowChoice[] {
  const s = structuredClone(input),
    a = legalActions(s),
    j = s.jobs[0];
  if (!j) return [];
  const direct: FlowChoice[] = a
    .filter((x) => !['turn', 'arrive'].includes(x.key))
    .map((x) => ({ key: x.key, label: x.key === 'end' ? 'End turn' : x.label, path: [x.key] }));
  for (const source of a.filter((x) => x.key.startsWith('source:'))) {
    const next = applyAction(s, source.key),
      figure = next.players[j.p].figures.find((f) => f.id === next.source)!;
    for (const child of legalActions(next))
      direct.push({
        key: `${child.key}@${figure.id}`,
        label: child.label,
        path: [source.key, child.key],
        page: figure.page,
      });
  }
  for (const key of ['turn', 'arrive'])
    if (a.some((x) => x.key === key)) {
      const next = settleFlow(applyAction(s, key));
      if (actingPlayer(next) !== j.p || next.winner !== null) continue;
      const children = flowChoices(next);
      // Arrival abilities can interrupt movement. Show their actual choice, with arrival bundled.
      for (const child of children) {
        const p = next.jobs[0];
        const figure =
          p?.type === 'place' ? next.players[p.p].figures.find((f) => f.id === p.char) : undefined;
        direct.push({
          key: child.key,
          label: child.key === 'end' ? 'End turn' : child.label,
          path: [key, ...administrativePath(applyAction(s, key)), ...child.path],
          ...(figure
            ? { page: figure.page }
            : child.page !== undefined
              ? { page: child.page }
              : {}),
        });
      }
    }
  return direct;
}
function administrativePath(input: State) {
  let s = structuredClone(input);
  const path: string[] = [];
  for (let n = 0; n < 100; n++) {
    const a = legalActions(s),
      j = s.jobs[0];
    if (!j || s.players[j.p].bot || s.winner !== null) break;
    if (
      a.length !== 1 ||
      !(
        a[0].key === 'turn' ||
        a[0].key.startsWith('source:') ||
        ['skip', 'end', 'arrive', 'empty', 'lost', 'character'].includes(a[0].key)
      )
    )
      break;
    path.push(a[0].key);
    s = applyAction(s, a[0].key);
  }
  return path;
}
export function applyFlow(s: State, key: string) {
  const choice = flowChoices(s).find((x) => x.key === key);
  if (!choice) throw Error('Stale choice');
  let next = s;
  for (const step of choice.path) next = applyAction(next, step);
  return settleFlow(next);
}
export function flowView(s: State, p: number) {
  const view = playerView(s, p);
  return { ...view, actions: p === actingPlayer(s) ? flowChoices(s) : [] };
}
