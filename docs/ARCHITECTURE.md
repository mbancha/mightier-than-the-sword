# Architecture

This is one standalone React/TypeScript application, with no shared framework
runtime. BG-Prototypes supplied the project toolchain and `src/kernel/rng.ts`;
the new engine follows its deterministic state/legality/replay patterns.

## Small reading paths

- Card wording or routine numbers: `src/data/content.json` and `catalog.ts`.
- Rules interaction: the named handler in `engine.ts`, then the relevant test.
- Page adjacency: `topology.ts` only. Page IDs are `book insertion index * 2 + side`; axial coordinates are stored on each book. Publication appends rather than reorders.
- Map camera, piece drag and piece menus: `TableMap.tsx`; player controls: `App.tsx`.
- Basic opponent decisions: `game/bot.ts`, using only a player projection.
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

## Growing map and bots

Three shuffled books start at axial coordinates (0,0), (1,0), (0,1). A publication
site must be empty and touch at least two existing books. Page edges connect the
right half of the left book to the left half of the right book; internal folds
also cost one step. Shortest paths search the current map, never absent books.

Movement supports a final destination action for bots/keyboard fallback and
single-step actions for dragging. Remaining movement lives in the pending job;
invalid drops do nothing. Publication and its neighboring-overflow bonus resolve
after token rewards but before the last token advances the Act. Unpublished order
is private; only the book currently being published is exposed.

Bots rank legal choices from `playerView`, with deterministic variation keyed by
decision number and public turn state. They do not inspect the full game state,
opponent hands, or deck order. Their decisions enter the same action history as
human decisions. A cancellable UI timer drives them; pause and undo stop the timer.
The map camera and open menus remain presentation state and do not affect saves.
