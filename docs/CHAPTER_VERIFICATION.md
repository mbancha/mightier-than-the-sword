# Chapters edition verification — 2026-10-16

Implemented on feat/chapters-and-books from the clean local checkout. GitHub refresh failed because github.com could not resolve. This report is local verification, not a deployment or balance claim.

## Evidence

- npm test -- --no-cache: 127 passing tests across ten suites, including 17 new Chapter tests and 110 retained previous-edition regressions.
- Tests cover deterministic mixed-deck setup, physical copy counts, all-player refill, chapter thresholds/turn consumption, private projections, illegal-action atomicity, power/capacity upgrades, first/second conflict rewards, immediate victory, multi-character movement, arrival timing, Creature placement ordering, page costs, minimum-hand stacking, gap-layout acceptance and Inkling conservation.
- Automated complete games finish at two, three and four players with the new bot consuming only an allowlisted player projection. Four additional three-player random-action seeded games verify resource conservation and completion.
- npm run docs: regenerated the current digital rules/content reference.
- npm run build: TypeScript and production bundle pass.
- npm run smoke: browser setup, two private handoffs, movement, placement, local save, undo, desktop and tablet journeys pass without page errors. Evidence: artifacts/chapter-smoke.json, chapters-desktop.png and chapters-tablet.png. Screenshots inspected.
- In this Windows sandbox the test runner's default temporary-file directory caused rename failures; setting TEMP and TMP to workspace artifacts/temp resolved them. Browser verification used installed Chrome and an approved execution outside the network-restricted sandbox to access localhost.

## Scope and limits

The new app runs ChapterApp, chapters.ts, and chapterBot.ts. Previous engine/UI modules and their tests remain as historical regression references and are not the current gameplay entrypoint. New content is in content.json.redesign, preserving legacy IDs and old print inputs. Saves use a separate edition and local-storage key. The layout suggestion is a bounded nearest-orientation search, followed by winner-controlled adjustments and validation; it does not claim a global mathematical minimum over all possible layouts.

Chapter specification labels defaults including 12 initially available Inklings, base capacity seven, all-player minimum-hand replenishment, duplicate ongoing handling and a secondary-character replacement fallback. These were supplied in the approved implementation plan and remain playtest tuning decisions.

No print output regenerated. No public-site deployment, remote push, PR, or merge performed. Human playtesting is still needed to assess pacing, clarity and balance, especially stacking overflow bonuses and cheap Twists.

## Local card revision verification — 2026-10-18

142 tests pass, including all five conflict Subplots for losing participants, extra paid-action availability, capacity, and existing private-view regressions. Production build passes. Extended browser smoke checks card art above text, both hand card types, graphical reserves and opponent hand counts, collapsed Library reference, automatic turns/bots, and hotseat privacy. Desktop/tablet screenshots: artifacts/cards-desktop.png and artifacts/cards-tablet.png. Removed the former action-panel height limit after inspecting screenshots. Balance values remain provisional for human testing. No push or deployment.

## Browser verification completed (2026-10-19)

The pending graphical publication journey now passes: legal book-shaped map
locations are displayed and clicking one adds exactly one new book. Inspected
artifacts/book-placement.png; targets are visually distinct and aligned with the
map, with pan/scroll available for the expanded layout. Existing turn/bot/privacy
smoke checks also pass. This supersedes the earlier approval-capacity blockage.
