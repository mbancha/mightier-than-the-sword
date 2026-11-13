# Chapters playtest update

The active engine reads `src/data/chapters-content.json`, the current snapshot of the live component spreadsheet. The older catalog remains available to legacy code. Run `npm run docs` to regenerate the rules and Component Studio 3 datasets. Run `python print/build_chapters.py` for the two letter-size PDFs.

The digital board fits the book layout to the viewport. Hover, click, keyboard, and touch controls reveal the private hand and public player details. In local multiplayer, handoff protects the next player's hand. The changed deck uses a new save edition.

The Chapters suite passed 31 tests, including 20 seeded games across two through five seats. The production build and Chrome desktop/tablet smoke passed. The local environment used the installed Vite 5 and Vitest 2 toolchain. The browser smoke serves the built files through Playwright request routing so it can run without a local HTTP listener.

The physical export uses the spreadsheet quantities and plain character faces. Component Studio datasets are ready for import. Studio template binding and its print preview still require a Studio project. Five-player victory and ordinary overflow cleanup are provisional rules recorded in PLAYTEST_RULES.md.
