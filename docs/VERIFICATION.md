# Verification — 2026-09-29

Current scope: growing-map revision 0.2 using v15 components. Not a designer
rules-completeness or balance certification. No public hosted release is claimed.

## Local evidence

- `npm test`: 34 passing tests, including 36 complete seeded 2/3/4-player legal
  action simulations plus 24 complete games with the playable basic bots. Tests cover deterministic setup, rejection atomicity,
  undo/replay, private projections, component conservation, memory sharing and
  return cost, foreshadowing, submarine overflow, character activation/collection,
  combat-card reshuffling, cleanup, token scoring and Act transitions; hex publication legality, single-step movement, book conservation and bot information boundaries.
- `npm run build`: TypeScript check and production build pass.
- `npm run smoke`: a GUI-only game from setup through six conflicts and all
  three Acts and all six publications. Direct protagonist dragging, piece menus, map zoom/pan, card clicks, memory-row clicks, undo, save, handoff, spectator mode and a real bot turn included.
  Desktop viewport 1600×1100, tablet viewport 820×1180. No browser console or
  page errors. No WCAG A/AA violations reported by the included axe checks.
- `python print/source/build.py` and `python print/check.py`: 16 vector PDF pages,
  40 cards, nine books, four player boards, 48 memory hexes, 15 conflict fronts
  and mirrored backs. Cut bounds, terminology, counts and physical sizes pass.
- The inherited dev tools were updated to Vite 7.3.6 and Vitest 4.1.11. npm audit
  reported zero known vulnerabilities after the patch update.

## Visual inspection

Opened and inspected `artifacts/table-desktop.png`, `table-tablet.png`, and
`bot-game.png`. The colored books, two-page separation, memory/Inkling
spaces, resource counts, legal-action panel and final score were readable, with
no overlap or horizontal tablet overflow. Tablet places the map first, then the rewards, choices and hand. The map uses its own zoomable camera.

Opened and inspected `artifacts/print/page-01.png` after adding three-book setup and post-conflict publication to the shared rules. The basic rules still fit one page at 9.5 pt, followed by the existing icon legend and component sheets. All 16 pages and component/cut bounds pass the print checks.

Screenshots and reports are generated, ignored artifacts. CI uploads browser
evidence so future reviews can inspect the exact changed build. Human tests and
unfamiliar-player validation remain the next maturity gate.
