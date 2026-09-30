# Mightier than the Sword

This repository belongs to both designers. Work must be understandable to a new
human or assistant without chat history. Start with README.md, docs/ARCHITECTURE.md,
and docs/DECISIONS.md. Read only relevant files; do not scan old conversations or
other games by default.

## Authority and editing

- Latest explicit designer instructions override existing files. Record new
  rulings in docs/DECISIONS.md, including what remains provisional.
- All edit requests apply to the digital prototype by default. Update print-and-play
  outputs only when the designers explicitly request a print sync.
- src/data/content.json is the current digital component text, numbers, effects,
  and rules source. Print generators can read it when a print sync is requested;
  existing printed outputs may represent an older edition. Run npm run docs after
  changing rules, but do not regenerate PDFs without that explicit request.
- Entries have stable numeric IDs equal to their original array positions.
  Append new entries; never reorder an existing catalog. Changes to card identity
  or mechanics require reviewing src/game/engine.ts and its focused tests.
- Keep rules in game/, presentation in App.tsx/styles.css, adjacency in topology.ts.
  No runtime dependencies on BG-Prototypes. Copied framework code is ours to adapt.
- State is serializable, randomness belongs to state, and pending choices are jobs.
  Expose newGame/applyAction/legalActions. Reject invalid actions atomically.
- Use explicit public/player projections. Never pass decks, seed, random state,
  opponent hands, or unrevealed Horse powers to a displayed view. Saves are private.
- Match the game's vocabulary: Inkling, foreshadow, memory, character, plot points.
  Actions stay readable words; preserve the existing sparse icon set.
- Do not introduce networking, bots, a universal rules language, or framework
  redesign without a concrete designer request.

## Collaboration and verification

One change per branch. Pull the latest main before starting; use a pull request
for review. Keep unrelated work untouched. The repository and its GitHub Pages
site are public by designer request; publish reviewed changes from `main`.

Run npm test and npm run build. For interaction changes run npm run smoke and
inspect its desktop/tablet screenshots. Tests verify mechanics, not game balance.
For PDF changes install print/requirements.txt, run python print/source/build.py,
then python print/check.py and inspect the rendered sheets in artifacts/print.

Update source audit, decisions, and verification evidence alongside implementation.
Keep maturity honest: currently a first human-playable automated prototype, not a
designer-validated rules-complete release. No implied balance guarantees.
