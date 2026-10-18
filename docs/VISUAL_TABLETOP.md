# Visual tabletop — 2026-10-17

Implemented the approved readability plan on feat/visual-tabletop. The gameplay rules, data catalog, saves, and print edition are unchanged.

TabletopBook.tsx renders horizontal spaces in their original left-to-right order and page split. Inklings use one SVG meeple per piece, colored by owner with an additional identifying mark. Characters use distinct standees, three-letter identifiers and protagonist stars. Inspecting a character reveals its name, power and ability. Overflow is a separate wrapping tray of individual meeples. Page rewards show ink cost and card/ink/overflow reward symbols; endpoints have no reward. Matching thematic symbols identify special spaces and book abilities. First-conflict status is represented by a token. Bookmarks retain their silhouette, icon and short name.

The renderer maps the current legal-action keys to page destinations, source characters and placement spaces. Board actions stay gated by private hand reveal and dispatch the existing rules actions. Full textual choices remain available. Invalid spatial targets have no action. UI selection and zoom do not alter game state. The map preserves its axial arrangement on desktop/tablet, with pointer pan, touch scrolling, zoom controls and width/height-aware fit. An expandable inspector keeps full book rules available.

Verification: all 127 existing tests pass, production build passes, updated browser journeys pass. Browser checks exercise direct space placement, private handoffs, movement, saving and undo. For every book they assert a common vertical coordinate for all spaces and increasing horizontal positions. A private-save fixture verifies five individual overflow meeples. Desktop and tablet screenshots were inspected, including the crowded tray and book inspector. Evidence is in artifacts/chapters-desktop.png, chapters-tablet.png, tabletop-desktop.png, tabletop-overflow-tablet.png and chapter-smoke.json.

Tests used workspace artifacts/temp for TEMP/TMP to avoid the Windows sandbox temporary-file issue. Browser checks used installed Chrome with approved access to localhost. No rules changes or print regeneration required.
