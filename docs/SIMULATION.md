# Simulations and bot strategy

Open **Balance lab** in the app, or run `npm run simulate -- --help`. The default
is 1,000 games, alternating 2, 3 and 4 players. Each game gets the next integer
seed. In comparison mode one strategic bot plays against basic bots, rotating
its seat within each player count. All-strategic is the normal benchmark.

## Bot priorities

- Complete the current Subplot when a legal action makes progress; favor
  travel, upgrades, activation, numbered placement, foreshadowing, memory
  triggers, conflict participation, erasures or Twists as appropriate.
- Favor useful numbered placement rewards, especially middle spaces with a
  Twist plus a memory. Anticipate whether filling a book favors the bot's side.
- Develop movement/placement early, hand limit when needed, and combat power.
- Activate characters for plausible erasures, useful new positions, power,
  replenishment, or Subplot progress. Avoid empty erasure actions.
- Prefer a Twist that reverses a visible losing conflict; conserve a pure-power
  card with a secure lead. Recognize Odysseus's replacement draw, solo Iliad
  bonuses, character bonuses, foreshadowing and overflow reinforcements.
- Choose rewards using current supply, hand size, available activation Inklings,
  Subplot needs and remaining Acts. Avoid submarine overflow when reinforcing.

These are estimates, not a search engine. Hidden hands, deck order and future
coin flips are unknown. The policy cannot optimize all multi-step combos or
predict opponents' responses. Subplot completion and resource values are fixed
heuristic weights, not a trained model. The Shared Story is pursued indirectly
by leaving attractive middle-space memories; bots cannot force others to use them.

## Report definitions

All tables exclude failed/capped games and separate 2-, 3- and 4-player games.
Always inspect sample counts; a rare card with a high percentage is weak evidence.
A tied game divides one win among winners. Thus win shares sum to one per game.
Missing denominators show a dash, never a fabricated zero rate.

- **Characters:** one sample per owning player-game. Includes acquisition Act,
  activations per owner and conflicts where the character was present at scoring.
  Several characters can share credit for one winning game/conflict.
- **Subplots:** starting-card game win share uses random starting draws. Offers
  include replacements and repeat draws. Completion rate is completed offers /
  all offers, including unfinished end-game offers. Time-to-complete uses table
  turns, only among completed offers. Completer game win share deduplicates each
  card/player-game. Later offers have less time to complete (censoring).
- **Books:** publication exposure, conflict frequency, participant entries and
  conflicts per Act. A conflict winner's game-win share counts that player once
  per book/game. Wins / participant entries is inherently 1 / average participants;
  it is not evidence that a book is strong. Raw JSON contains each conflict winner.
- **Twists:** total plays and eventual conflict wins among player-conflicts in
  which the card was played. Multiple plays in one player-conflict count once
  for that rate. Passing because already ahead affects these samples.
- **Conflict tokens:** acquisition counts, including shoot-the-moon pickups;
  strong-side refreshes are not new acquisitions. Ownership associations have
  the same selection bias as characters.
- **Turns:** actual turns begun, not choices, including moon turns and turns
  interrupted by an Act transition. Per-player totals are in `players.csv`.
- **Upgrades:** every memory placement, including a returned memory placed again.
  They are not inferred from final upgrade levels.
- **Resources:** numbered/overflow placement attempts, actual foreshadowed
  Inklings, erasures excluding conflict cleanup, and placement-triggered memory
  rewards (counted for the placer, not doubled for the memory owner). Submarine
  drowning caused by placement/transfer counts as an erasure.
- **Points:** all engine point awards grouped by their stated source. Their sum
  is tested against final player scores. Seat/policy tables reveal order effects.

Ownership often follows success: winning conflicts grants characters and
resources. Therefore a character holder's above-baseline win share is an
association, not proof that the character caused the wins. Review acquisitions,
starting Subplots, turn-order results, sample sizes and human playtests together.
Different bot policies can produce different apparent balance.

## Reproduction and failures

HTML is the readable report. JSON retains configuration, versions, fingerprint,
per-game outcomes, player metrics, Subplot offers and conflicts. `players.csv`
has one row per completed player-game; `statistics.csv` has long-form table
metrics (rates are fractions, not percentages). JSON contains failed seeds,
errors and attempted action keys, excluded from the averages. CLI exit code 1
means at least one failed game. The default action cap is 5,000; change with
`--max-actions`, up to 20,000. Batch size accepts 1–100,000, subject to local
memory/time. Large raw reports can be substantial.

For a failed seed, select its reported player count and seed and rerun with
one game. In comparison mode, use the original batch configuration to preserve
seat rotation (the JSON identifies the per-seat policies). Successful games
can be reproduced by the same seed, player count, policy and implementation;
keep a Git commit with important reports. Catalog fingerprint is a lightweight
change detector, not a cryptographic integrity guarantee.

Stopping in the app returns results after the current ten-game batch; closing
it terminates immediately. CLI Ctrl+C requests a partial report. Reports remain
local. Use a new `--out` folder to retain earlier runs.
