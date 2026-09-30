# Verification — 2026-09-29

Current scope: first human-playable automated prototype from v15. Not a designer
rules-completeness or balance certification. No public hosted release is claimed.

## Local evidence

- `npm test`: 26 passing tests, including 36 complete seeded 2/3/4-player legal
  action simulations. Tests cover deterministic setup, rejection atomicity,
  undo/replay, private projections, component conservation, memory sharing and
  return cost, foreshadowing, submarine overflow, character activation/collection,
  combat-card reshuffling, cleanup, token scoring and Act transitions.
- `npm run build`: TypeScript check and production build pass.
- `npm run smoke`: a GUI-only game from setup through six conflicts and all
  three Acts; cancellation, undo, save, handoff and spectator mode included.
  Desktop viewport 1600×1050, tablet viewport 820×1180. No browser console or
  page errors. No WCAG A/AA violations reported by the included axe checks.
- `python print/source/build.py` and `python print/check.py`: 16 vector PDF pages,
  40 cards, nine books, four player boards, 48 memory hexes, 15 conflict fronts
  and mirrored backs. Cut bounds, terminology, counts and physical sizes pass.
- The inherited dev tools were updated to Vite 7.3.6 and Vitest 4.1.11. npm audit
  reported zero known vulnerabilities after the patch update.

## Visual inspection

Opened and inspected `artifacts/table-desktop.png`, `table-tablet.png`, and
`result-desktop.png`. The colored books, two-page separation, memory/Inkling
spaces, resource counts, legal-action panel and final score were readable, with
no overlap or horizontal tablet overflow. Tablet places action controls above
the table. Restored the printed-points indicator at intermediate widths.

Opened and inspected `artifacts/print/page-03.png` after reconnecting the PDF
generator to the shared JSON catalog. The four enlarged books retained their
centerlines, 2 mm outer margins, current icons and original token-space sizes.
The migrated generator preserves v15 layout; its card/cut bounds are checked.

Screenshots and reports are generated, ignored artifacts. CI uploads browser
evidence so future reviews can inspect the exact changed build. Human tests and
unfamiliar-player validation remain the next maturity gate.
