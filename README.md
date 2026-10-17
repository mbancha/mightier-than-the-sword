# Mightier than the Sword — Chapters edition

Digital redesign 1.0.0, ready for implementation verification and designer playtesting. Run npm ci, npm run dev.

The current entrypoint is src/ChapterApp.tsx; rules are in src/game/chapters.ts, public-view bot choices in src/game/chapterBot.ts, and content in src/data/content.json under redesign. Older engine/UI modules and tests are retained as legacy regression references; they do not drive the current app. Stable legacy component IDs remain intact.

See docs/CHAPTER_SPEC.md for the complete confirmed rules and provisional playtest defaults; docs/RULES.md is generated using npm run docs.

Players race for three books at two players or two books at three/four players. Spend scarce ink, finish personal chapters, gain bookmarks at first conflicts and books at second conflicts. The deck has 45 Twists and 30 Subplots.

Use npm test, npm run build, npm run smoke. The smoke journey generates desktop/tablet screenshots in artifacts. Saves are private and edition-specific. Undo cannot undo knowledge. The bot accepts only an allowlisted player view.

Print files remain the prior edition pending a separate print-sync request. No deployment is implied by this local implementation.
