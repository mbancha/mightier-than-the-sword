import { expect, it } from 'vitest';
import { newGame, applyAction, legalActions, playerView, content, actingPlayer } from '../src/game/chapters';
import { chooseChapterAction } from '../src/game/chapterBot';
import { settleFlow, flowChoices, applyFlow } from '../src/game/chapterFlow';

it.each([2, 3, 4, 5])('finishes seeded games with %s seats using only legal player-view actions', (seats) => {
  for (const seed of [42, 17, 71, 101, 7]) {
    let game = newGame(Array.from({ length: seats }, (_, i) => 'P' + i), seed);
    expect(game.books).toHaveLength(seats < 4 ? 3 : 4);
    const cards = [...game.deck, ...game.players.flatMap((p) => p.hand)];
    expect(cards.filter((c) => c.kind === 'twist')).toHaveLength(27);
    expect(cards.filter((c) => c.kind === 'subplot')).toHaveLength(5);
    for (let turn = 0; turn < 5000 && game.winner === null; turn++) {
      const actor = actingPlayer(game);
      const view = playerView(game, actor);
      expect(view.players.every((p, i) => i === actor || !p.hand.length)).toBe(true);
      const key = chooseChapterAction(view);
      if (!key) throw Error('No action for ' + game.jobs[0]?.type + ' at seed ' + seed);
      game = applyAction(game, key);
    }
    expect(game.winner, 'seed ' + seed).not.toBeNull();
  }
});

it('grants both rewards from the first page space before continuing', () => {
  let game = newGame(['A', 'B'], 42);
  const b = game.books.find((b) => b.id < 3)!;
  const p = game.players[0];
  p.ink = 2;
  p.figures[0].page = b.id * 2;
  const n = p.hand.length;
  game.jobs = [{ type: 'place', p: 0, char: p.figures[0].id, normal: true, first: true }];
  game = applyAction(game, 'place:0');
  const reward = content.books[b.id].spaces[0];
  expect(game.players[0].ink).toBe(2 + Number(reward.match(/(\d+) ink/)?.[1]));
  expect(game.players[0].hand.length).toBe(n + Number(reward.match(/(\d+) cards/)?.[1] ?? 0));
});
it('keeps a legal choice visible through a complete human/bot flow', () => {
  let game = settleFlow(newGame(['A', 'B'], 17, [false, true]));
  for (let i = 0; i < 4000 && game.winner === null; i++) {
    const actor = actingPlayer(game);
    const bot = game.players[actor].bot;
    const key = chooseChapterAction(bot ? playerView(game, actor) : {
      ...playerView(game, actor),
      actions: flowChoices(game),
    });
    if (!key) throw Error('No choice at ' + game.jobs[0]?.type);
    game = bot ? settleFlow(applyAction(game, key)) : applyFlow(game, key);
  }
  expect(game.winner).not.toBeNull();
});
