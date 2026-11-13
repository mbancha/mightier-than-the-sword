# Mightier than the Sword · Chapters

Run `npm ci` and `npm run dev`. The table fits the current book layout. Hover or tap the edge controls for your hand, tableau, opponent details, and story controls. Hot-seat players reveal their own hand at handoff.

The live [spreadsheet](https://docs.google.com/spreadsheets/d/1BTtI27_6SqO6YJhufK1WaawX9lgafQbZwg-X9Dz1pJY/edit) supplies component text and quantities. `src/data/chapters-content.json` is its checked-in snapshot. The Chapters rules engine is in `src/game/chapters.ts`.

- Run `npm run docs` to regenerate the rules reference and the five Component Studio 3 CSV files.
- Import each CSV into its corresponding dataset. Keep the `name` and `quantity` headers and preview the full replacement before importing.
- Run `python print/build_chapters.py` with ReportLab and pypdf installed to produce the letter-size playtest kit.
- Run `npm test` and `npm run build` to verify changes.

Current rules and provisional rulings are in [docs/RULES.md](docs/RULES.md).
