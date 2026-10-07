# Verification — 2026-09-30

Earlier verification: space-check revision 0.3 on the growing-map prototype. This is
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

## Digital revision 0.4 verification

- All 80 tests pass, including 13 focused cases for new setup, shared hand limit,
  no middle-space draw, castle erasure, surviving Frankenstein overflow, seeded
  coin flips and negative scores, Iliad power, Odyssey movement, Aeneid cleanup,
  World movement, Nemo suspension and per-Inkling Journey overflow power.
- Production build and browser smoke pass. Browser playthrough completed after
  170 choices, six conflicts and all nine books published; bot turn and six-game
  worker simulation passed, with no browser errors or accessibility violations.
- Inspected desktop and tablet screenshots: castle visible, plain middle slots,
  combined hand limits and card counts readable, no horizontal tablet overflow.
- Print outputs and generators were not changed. They remain the previous edition
  until an explicit print-sync request. Historical simulation results remain
  labeled 0.3 and must not be treated as balance evidence for 0.4.

## Digital revision 0.5 verification

- 92 tests pass, including all ten current-state objectives, simultaneous requirements, returned memories, current-conflict participation, reward/replacement behavior, and private-view isolation.
- Production build and full browser smoke pass: 169 choices, six conflicts, nine books, bot turn and browser simulation, no browser errors or accessibility violations.
- Desktop/tablet screenshots inspected. Only the owner sees their Subplot; opponents show a hidden-card count, spectators show no objective, and public progress counters are gone.
- Printed artifacts and generators unchanged. Previous simulation reports remain historical; objective and bot behavior now use rules 0.5 and strategic-3.


## Revision 0.6 local verification (2026-10-05)

104 tests passed, including twelve new track cases: tier availability, overflow-only and mixed placements, adjacent-page bounds and early stop, five-step movement, final Quill power, optional four-card refill, missing Subplot and depleted-deck behavior, end-turn scheduling, final-token refill, shoot-the-moon refill, and immediate conflict interruption. Production build passed. Browser journey: 193 choices, six conflicts, nine published books, a complete three-Act game, actual drag/memory interactions, save/undo, privacy handoff, bot turn, Balance lab, desktop/tablet layout, no console or page errors, and no axe violations. Print generator/check passed: 20 vector sheets, full-size player boards, 48 correctly colored memory hexes, 15 one-inch conflict fronts with long-edge mirrored backs, all component card boundaries, current catalog/version wording, and a single master output. Rendered contact sheets plus detailed player boards and player pieces were inspected.

GitHub's initial shared runner timed out the deterministic two-batch simulation test after 5 seconds while 103 assertions passed. Only that full-game batch test now allows 30 seconds; mechanics and invariants are unchanged. Token fronts/backs are the last two pages (19-20), with actual-size and long-edge duplex instructions on the legend.


## Obsolete-folder cleanup

Verified all 17 legacy SVG files were identical to the retained public icons. Print validation now checks the canonical SVG set and provenance paths rather than obsolete PNG exports. The master PDF was not changed by cleanup.


## Half-sheet player-board validation (2026-10-06)

Regenerated the master from the current checkout without the removed assets folder. Print checks pass for 18 vector-only pages, exactly two boards per board sheet, all four player colors, 12 full-size memory slots per board, text inside board boundaries, and exact catalog text in every base/upgrade cell. Word-count comparison against each original full-sheet board showed no added or removed words. Rendered both player-board sheets and reviewed all content, including the longest final Insight benefit and reserve reminders. Token duplex instructions and page indices are updated to 17-18.


## Rules overhaul + fifteen placement Subplots (2026-10-07)

108 tests pass, including every objective's positive/negative predicate, ownership and adjacency, binding/page distinction, fresh-placement-only completion, immediate snapshot, replacement guard, opponent privacy, neutral occupancy, pre-cleanup ranking, repeated token scoring, no-supply/exhausted Act recovery and retained-card scoring. Applicable old tests remain; tests asserting superseded hand limits, shared memory payouts and old token bonuses are replaced by 0.7 coverage. Build passes.

100 strategic games across 2/3/4 players complete with zero failures/caps (artifacts/simulations/edition-07-integration). Full browser smoke completes 159 choices, six conflicts, nine books and all Acts; verifies direct Quill drag, memory menu, undo, handoffs/spectator privacy, bot turn and Balance lab. No console/page errors or accessibility violations. Desktop/tablet screenshots reviewed.

Single master PDF regenerated and print/check.py passes: 18 vector-only sheets, 45 cards including all fifteen objectives, two boards per sheet with full-size memory slots, 48 memories, neutral piece, and mirrored token backs. Contact sheets visually reviewed. Obsolete printed +3 book bonuses and overflow labels removed. Tests verify implementation; these simulations do not certify balance.

GitHub's first integration run timed out before tests: Ubuntu's Azure package mirror stalled during Playwright dependency installation. CI now selects the responsive HTTPS Ubuntu mirror on mirror-list runners and runs tests/build before browser installation. The same smoke check remains required.

## One memory per book — 0.7.1 (2026-10-07)

110 tests pass, including second-memory rejection across pages/bonus upgrades, other-player allowance and Lasting Impression ownership/page/binding checks. Production build and full browser smoke pass (159 choices, six conflicts, all Acts; no errors or accessibility violations). Single 18-sheet PDF regenerated; print checks and visual review of revised card and rules pass.


## Character Development memory symbols (2026-10-07)

All 110 tests passed and TypeScript/Vite production build passed. Chrome browser journey exercised a placed Tension memory, completed games, and generated desktop/tablet screenshots; those previews show the four new names and reward symbols with player-colored memory borders. Its final console assertion fails on one unidentified 404 resource (not observed in page response instrumentation). This browser check is therefore not fully passing. Print output was not regenerated.
