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

## Immediate conflicts and space checks

Normal movement jobs retain their origin. Legal destinations and End move require
leaving that page; a final step back to it is rejected. Effect moves stay optional.
Direct placeHere/memoryHere actions delegate to the same placement/upgrade jobs.

Placement queues checkConflict before earned reward jobs are added ahead of it.
Those rewards finish first; battle interrupts the remaining placement jobs.
A pendingConflicts list serializes other full books without nested battles.
The last token still ends the turn and Act after rewards/publication.

Battle cursor is a numbered space index. slotOwner is latched for the current
check; future occupants are read live. slotPlayed and extraUsed enforce one card
per space and at most one character-granted extra per player per conflict.
The public projection exposes the current scan position, never hidden cards.
UI tracks render the shared catalog's four levels, showing covered memories and
the currently active level. Rules version 0.4 rejects earlier edition replays. Print outputs are synced only on explicit request.

## Strategic policy and headless Balance lab

`game/bot.ts` scores legal choices using only `playerView`. The view supplies
public per-book powers and the current effect's public source/book. No hidden
decks, other hands, seed or simulation telemetry are exposed. Scores combine
Subplot progress/completion, memory/placement rewards, character destinations,
resource needs and visible conflict margins, with small deterministic variation.
`basicBot.ts` preserves the original baseline. Neither policy searches future
states; displayed character IDs remain the catalog's stable numeric IDs.

`newGame(setup, true)` optionally enables a structured event buffer. Engine
mutation sites emit events without changing mechanics or consuming randomness.
The simulator drains this buffer after each atomic action; interactive saves do
not enable it. Turn events follow the actual turn counter, including automatic
Act transitions and shoot-the-moon turns. Public views exclude events.

`simulation/runner.ts` executes the same legal engine actions as the UI, using
one current state rather than keeping all undo snapshots. It checks normal
engine invariants on every action, caps decisions per game, and retains failed
seeds/action lists. `summarize` derives tables from per-game/per-player records.
`simulation/report.ts` formats HTML and CSV. The UI worker and Node CLI share
these modules, so reported data does not depend on the interface used.

The worker yields every ten games for progress/cancellation. Closing the lab
terminates it; downloaded reports are the durable output. The CLI's Vite module
loader transpiles local TypeScript with no listening HTTP/HMR server. It exits
nonzero if any game fails. A seed reproduces a run only with the same rules,
catalog and bot implementation; report metadata records all three versions.
