# Mightier than the Sword

A shared workspace for the game design, printable prototype, and an automated
2–4 player prototype with human and basic-bot seats. Current source: **v15 components with growing-map rules 0.2**.

The first build includes all nine books, fifteen Twists, ten incremental Subplots,
ten characters, five Trojan Horse powers, and fifteen conflict tokens. It handles
movement, memories, conflicts, Acts, card effects, private-hand handoffs, undo,
local saves, and portable private replays. It is ready for designer testing;
rules fidelity and balance still need human playtesting. No remote multiplayer is included. Basic bots can fill any seat. See [known rulings](docs/DECISIONS.md).

## Run it

Install Node.js 22.12 or newer, then open a terminal in this folder:

```sh
npm ci
npm run dev
```

Open the localhost address printed by the command. On Windows use `npm.cmd` if
PowerShell blocks npm scripts. The app runs entirely on your device. You and your
co-designer can each run a copy from your own checkout.

Use **Save locally** to keep a game on that device. **Download private save** makes
a replay another designer can load. It contains all hands, hidden powers, and the
shuffle seed; do not share it with opponents during a game. Undo rewinds state,
but cannot undo knowledge. A save requires the same content/rules edition.

## Playing at the table

Choose Human or Basic bot for each seat (the default is you versus one bot).
Click a starting page. Click your quill-and-inkwell to highlight adjacent pages,
then drag it or click a highlighted page. Each step uses one move; click the
figure again and choose **End move** when finished. Its menu offers your turn
choices. Click an empty space to place an Inkling, a memory row to upgrade, a
character activation space to use it, or a card in your hand to play it.

Drag the empty map background to pan. Use the wheel or +/− to zoom; **Fit map**
frames the books. After a win, click a dashed publishing position, then a touching
book's overflow. **All legal actions** remains available for unusual card choices
and keyboard use. Bots can be paused or sped up; undo pauses bots for inspection.
Saves preserve seat controllers. Old 0.1 saves require their matching release.

## Start a design session

1. Get the latest `main`, then create a branch for your change.
2. Read [current rules](docs/RULES.md) and [decisions](docs/DECISIONS.md).
3. Change the [shared catalog](src/data/content.json), plus mechanics if needed.
4. Run checks, play the change, then open a pull request for the other designer.

Any coding assistant can start with `AGENTS.md`. You do not need the original
conversation or the other board-game projects. See [the editing guide](docs/EDITING.md).

## Where things live

| Location | Purpose |
| --- | --- |
| `src/data/content.json` | Shared component text, rule text, balance, token/Subplot effects |
| `src/game/engine.ts` | Turn flow, legality, choices, card interactions and scoring |
| `src/game/topology.ts` | Growing hex layout and page-edge adjacency |
| `src/game/session.ts` | Save/load, replay and undo |
| `src/game/views.ts` | Public and private information boundaries |
| `src/App.tsx`, `src/TableMap.tsx`, `src/styles.css` | Table, player boards and interaction |
| `public/icons/` | Original reusable vector icons |
| `print/source/` | Printable generator, reading the same catalog |
| `print/outputs/` | Approved v15 PDF and latest generated edition |
| `tests/`, `scripts/smoke.mjs` | Rules and full-game browser checks |
| `docs/` | Rules, rulings, architecture, audit and verification |

## Checks and printable sheets

```sh
npm test
npm run build
npx playwright install chromium
npm run smoke
npm run docs
python -m pip install -r print/requirements.txt
python print/source/build.py
python print/check.py
```

Browser screenshots and reports are under ignored `artifacts/`. The PDF contains
all 16 sheets together. Its books have 2 mm margins; memory hexes are 0.75 inches
wide and conflict tokens are 1 inch square with mirrored backs.

## Sharing

The GitHub repository is private. Its owner can invite the co-designer under
Settings → Collaborators. Both designers use separate branches and review pull
requests. GitHub Actions runs the rules/build/browser checks and saves the built
app as an artifact. Hosting is not enabled automatically; a private source
repository does not by itself establish who can access a hosted site.

Framework provenance: selectively copied from the owner's BG-Prototypes template
(React/Vite setup and seeded randomness), then adapted into this independent app.
Game content and icons come from the existing Mightier prototype. No open-source
license is granted by this repository; retain third-party package licenses.
