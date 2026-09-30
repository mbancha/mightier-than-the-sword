# Verification — 2026-09-30

Current scope: space-check revision 0.3 on the growing-map prototype. This is
ready for designer testing, not a balance or rules-completeness certification.
No public hosted release is claimed.

## Local evidence

- `npm run verify` passed: 51 tests, production build and browser journey.
- Tests include 36 seeded 2/3/4-player legal-action simulations and 24 complete
  basic-bot games, alongside deterministic replay, privacy and conservation checks.
- Sixteen focused new tests cover mandatory movement, invalid return-to-origin,
  direct placement/upgrading, middle-space rewards, memory-only spaces, immediate
  interruption of multi-placement actions, repeated left-to-right opportunities,
  future occupant changes, extra-card limits and Agamemnon's exception.
- Browser journey: 189 choices, six conflicts, all nine books and all three Acts.
  Actual pointer dragging, direct empty-space placement, clicking an owned Inkling
  to upgrade, visible levels for all four tracks, current conflict-space highlight,
  card choices, save/undo, privacy handoff, zoom/pan and a real bot turn verified.
  Desktop 1600x1100 and tablet 820x1180. No console/page errors; included axe
  checks reported no accessibility violations.
- `python print/source/build.py` and `python print/check.py` passed: 16 vector
  pages, 40 cards, nine books, four player boards, 48 memory hexes, 15 conflict
  fronts and mirrored backs. Current rule wording, cut bounds and physical sizes
  are checked. All cards remain inside their cut boundaries.

## Visual inspection

Inspected desktop upgrade tracks and conflict scan, plus tablet layout. Current
levels, covered memory tokens, middle-space Twist icons and current space are
visible. The table has its own zoom/pan camera and no horizontal tablet overflow.

Inspected PDF rules, legend, books, adapted Twists, Agamemnon and Horse powers.
Basic rules fit one page at 9.5 pt; the icon legend occupies the next page.
Four rotated books per sheet retain 2 mm margins and middle-space Twist symbols.
Revised card text fits without clipping. Historical v15 snapshot is unchanged.

Screenshots/reports are generated under ignored `artifacts/`; CI stores browser
evidence for review. Human playtesting remains necessary for feel and balance.

Starting Subplot follow-up: setup coverage verifies one distinct face-up Subplot
for every seat in 2/3/4-player human/bot games, correct deck removal and zero
progress. Browser checks verify both starting objectives and rewards are visible.

## Strategic bots and Balance lab follow-up

- Final `npm run verify`: 67 passing tests, production build and full browser
  journey passed. The 16 additional tests exercise Subplot pursuit, reward combos,
  useful character actions, selective Twist use, hidden-information boundaries,
  deterministic simulation, event accounting, ties, capped games, cancellation
  and comparison-seat rotation.
- Telemetry-enabled and ordinary gameplay are identical. Score awards reconcile
  to final scores, turn counts reconcile to the engine's turn counter, and
  completion/conflict totals reconcile to recorded events.
- Default headless run: 1,000/1,000 completed, zero failed. Comparison run:
  300/300 completed, zero failed. Configuration and observed results are recorded
  in SIMULATION_RESULTS.md; no claim of established balance.
- Browser Balance lab: default 1,000 shown, user changed to six games, worker
  completed them, HTML downloaded, and the existing live game remained unchanged.
  Desktop and tablet layouts inspected, no horizontal page overflow or browser
  errors. Lab axe checks reported no accessibility violations.
- Standalone CLI ran with HTTP/HMR disabled and produced all four report files.
  No PDF regeneration: this update changes policy, reporting and controls only.

## GitHub Pages publication

The static build uses relative asset paths so it can load from the repository
subpath on GitHub Pages. The publishing workflow builds from `main`, uploads
`dist`, and deploys to the `github-pages` environment. Local tests/build and a
live-site browser check are required before calling the hosted edition ready.
