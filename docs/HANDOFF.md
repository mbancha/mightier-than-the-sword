# Continue MttS local playtesting

Use this existing MttS checkout. Verify the current branch and working tree before editing.
Branch: codex/cards-subplots-local. Its current uncommitted changes are intentional
and tested; preserve them. They have NOT been pushed. Do not replace this checkout
with a fresh clone, reset it, or publish without the designer's approval.

Read AGENTS.md, README.md, docs/ARCHITECTURE.md, docs/CHAPTER_SPEC.md and the latest
entries in docs/DECISIONS.md and docs/CHAPTER_VERIFICATION.md. Active runtime:
src/ChapterApp.tsx, src/game/chapters.ts, src/game/chapterFlow.ts; canonical active
content: src/data/content.json.redesign. Legacy engine files are not the active game.

Latest local work: all conflict Subplots require participation rather than winning;
simple ongoing upgrades and two +3 capacity bonuses; card faces with upper art
placeholders and compact icon costs; graphical hands/reserves; collapsed Library.
142 tests, production build and desktop/tablet smoke passed. Screenshots are in
artifacts/cards-desktop.png and artifacts/cards-tablet.png. Local server port 5173.
Start a new story for playtesting changed rewards. PnP stays untouched.

General future-prototype UI standards were published separately in
mbancha/BG-Prototypes, docs/PLAYER_EXPERIENCE.md, via merged PR #5. Do not confuse that repo
with this standalone game. Further designer feedback should modify this local game.

Latest local follow-up: optional ability/reward offers no longer require a separate
skip/continue click. chapterFlow.ts exposes continuation actions alongside them.
149 tests and build passed; browser smoke verified. Preserve all local changes.

Latest: new-book placement uses highlighted map locations; obsolete Conflict Token
UI and active Subplot text now refer to the claimed bookmark. 149 tests and build
pass. Browser placement test awaits execution: approval service at capacity.

2026-10-19: Pending book-placement browser check completed successfully. Clicking
a highlighted map location adds one book. Screenshot artifacts/book-placement.png
was inspected. Earlier approval-service capacity limitation is resolved. All work
remains local for designer playtesting.

## Publication authorized (2026-10-19)

The designer authorized pushing and merging all current changes. This supersedes
prior local-only notes above. This revision includes the card/Subplot redesign,
optional benefits alongside continuation actions, graphical book publication and
bookmark-based book status. Local verification: 149 tests, production build and
extended browser smoke passed; placement screenshot inspected. Check Git status
and GitHub before relying on any branch or publication status in earlier notes.
