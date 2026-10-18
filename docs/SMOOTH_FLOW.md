# Smooth turn flow — 2026-10-17

Approved interface update. Rules engine and content remain unchanged. chapterFlow.ts adapts legal engine actions into meaningful player decisions. Administrative transitions are bundled into the same action/Undo step. Optional ink purchases, Subplot rewards, combat passes and chapter choices remain explicit.

Human turns automatically enter movement when no chapter decision exists. At low ink the movement choices include starting the turn, leaving chapter ending available until movement commits. Movement can flow directly into page placement; arrival abilities interrupt only for real choices. With two moved characters, placement targets carry their source character. Sole unavailable effects, sole completion steps and mandatory companion draws advance automatically. The textual full-action list is retained inside All actions.

Bots run by default, including setup and decisions during another player's conflicts. The runner continues to use only playerView. Solo humans see their hand automatically; shared-screen humans use a Pass to handoff. Bot hands never render. Human snapshots are retained before meaningful choices; bot responses do not add intervening Undo stops. Undo pauses automation, and restarting/loading a story resumes it.

Evidence: 134-test full suite passed, followed by eight passing focused flow tests including the added complete mixed human-flow/bot game (135 total tests represented). Production build and smooth browser smoke pass. Focused coverage includes automatic turn start, compound movement/placement, two-character source selection, preserved optional bonuses, low-ink chapter choice, automatic end when no placement remains and leaving bot decisions to its runner.

The browser journey performs human setup, waits for automatic bot setup, moves and places directly, resolves a bonus, ends the human turn and waits for the bot to return control at turn three with no Reveal/Begin/Resume click. It checks Undo pauses bots, horizontal tracks remain aligned, and two-human handoffs hide private cards. Inspected screenshots: artifacts/smooth-desktop.png and smooth-tablet.png. Machine-readable evidence: artifacts/smooth-smoke.json. Current npm run smoke invokes scripts/smooth-smoke.mjs; previous scripts remain historical.

No print regeneration or public deployment performed.
