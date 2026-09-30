import { newGame, applyAction, assertInvariants } from './engine';
import { content } from '../data/catalog';
import type { GameState, Action, Setup } from './types';
export interface Session {
  setup: Setup;
  history: GameState[];
  actions: Action[];
}
export const createSession = (setup: Setup): Session => ({
  setup,
  history: [newGame(setup)],
  actions: [],
});
export function advance(session: Session, action: Action): Session {
  const next = structuredClone(session.history.at(-1)!);
  const err = applyAction(next, action);
  if (err) throw Error(err);
  return { ...session, history: [...session.history, next], actions: [...session.actions, action] };
}
export const undo = (session: Session): Session =>
  session.history.length > 1
    ? { ...session, history: session.history.slice(0, -1), actions: session.actions.slice(0, -1) }
    : session;
// Full saves/replays contain hidden information; the UI labels them private.
export const exportSession = (s: Session) => ({
  schema: 1,
  rulesVersion: content.rulesVersion,
  content: JSON.stringify(content),
  visibility: 'private',
  setup: s.setup,
  actions: s.actions,
});
export function importSession(raw: unknown): Session {
  const r = raw as ReturnType<typeof exportSession>;
  if (
    !r ||
    r.schema !== 1 ||
    r.rulesVersion !== content.rulesVersion ||
    r.content !== JSON.stringify(content) ||
    r.visibility !== 'private' ||
    !Array.isArray(r.actions) ||
    r.actions.length > 20000
  )
    throw Error(
      'Unsupported save or different rules edition. Keep the matching release to resume old games.',
    );
  let session = createSession(r.setup);
  for (const action of r.actions) session = advance(session, action);
  assertInvariants(session.history.at(-1)!);
  return session;
}
