# Architecture

This is one standalone React/TypeScript application, with no shared framework
runtime. BG-Prototypes supplied the project toolchain and `src/kernel/rng.ts`;
the new engine follows its deterministic state/legality/replay patterns.

## Small reading paths

- Card wording or routine numbers: `src/data/content.json` and `catalog.ts`.
- Rules interaction: the named handler in `engine.ts`, then the relevant test.
- Page adjacency: `topology.ts` only. Page IDs are `book position * 2 + side`.
- Layout or action choices: `App.tsx` and `styles.css`.
- Save/undo: `session.ts`. Public/private boundaries: `views.ts`.
- Print layout: `print/source/build.py`. Content is imported through `catalog.py`.

Do not read all source files for a one-line card edit. Component array positions
are stable IDs. Book *positions* vary with setup; a board entry stores its catalog
ID separately. Token IDs are Act I 0–4, Act II 5–9, Act III 10–14.

## State and effects

`newGame({names,seed})` returns plain serializable state. A queue of plain jobs
stores effects and pending choices. `pump` resolves automatic jobs until input
is needed. `legalActions` returns labels and opaque action keys. `applyAction`
recomputes legality, applies to a clone, checks invariants, and commits only on
success. No closures, DOM state, or wall-clock randomness live in game state.

UI selection and cancellation do not change the game. Confirmation dispatches
one legal key. Jobs can belong to a different player than the active turn, so
memory rewards, character collection, and combat choices have proper handoffs.

The rules-specific job handlers deliberately stay ordinary TypeScript. New exotic
cards can add a focused handler; this is not a general-purpose rules language.
Simple token/Subplot reward sequences and common balance values are catalog data.

## Persistence and privacy

Sessions hold immutable snapshots and action history. Undo removes both together.
Saves contain setup, version, exact catalog fingerprint, and actions; loading
replays validated actions from the seed. Changed editions reject old saves with
an explanation. Keep a tagged release for important playtest saves.

`publicView` is an allowlist. `playerView` adds only the selected player's hand,
Horse choice, and legal choices. Handoffs unmount private cards and action lists.
This is screen privacy on one trusted device, not adversarial network security.
Private save files and browser memory intentionally retain all information.

## Change scope

The initial UI is deliberately straightforward: named legal targets and a confirm
step, with the board also filtering target choices. There are no bots, servers,
accounts, analytics, external art requests, or cross-game imports.
