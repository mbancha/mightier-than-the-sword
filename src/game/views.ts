import { currentPlayer, legalActions, power } from './engine';
import type { GameState } from './types';
// Explicit public allowlist: no seed, random state, decks, jobs or hidden powers.
export function publicView(s: GameState) {
  return {
    players: s.players.map((p) => ({
      name: p.name,
      supply: p.supply,
      reserves: [...p.reserves],
      out: p.out,
      points: p.points,
      page: p.page,
      rows: { ...p.rows },
      everUpgraded: [...p.everUpgraded],
      handCount: p.hand.length,
      subplot: p.subplot,
      progress: p.progress,
      horseSpent: p.horseSpent,
    })),
    books: structuredClone(s.books),
    characters: structuredClone(s.characters),
    pools: structuredClone(s.pools),
    act: s.act,
    turn: s.turn,
    active: s.active,
    actor: currentPlayer(s),
    over: s.over,
    deckCounts: {
      twist: s.decks.twist.length,
      subplot: s.decks.subplot.length,
      character: s.decks.character.length,
    },
    battle: s.battle
      ? {
          book: s.battle.book,
          participants: [...s.battle.participants],
          powers: s.players.map((_, p) => power(s, p, s.battle!.book)),
          winner: s.battle.winner,
        }
      : null,
    log: [...s.log],
  };
}
export function playerView(s: GameState, p: number) {
  return {
    ...publicView(s),
    hand: [...s.players[p].hand],
    horse: s.players[p].horse,
    actions: currentPlayer(s) === p ? legalActions(s) : [],
    prompt: s.jobs[0]?.type ?? 'over',
  };
}
