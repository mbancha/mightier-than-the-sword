# Mightier than the Sword

A shared workspace for the game design, printable prototype, and an automated
2–4 player prototype with human and strategic-bot seats. Current digital and printable rules: **0.6**.

The first build includes all nine books, fifteen Twists, ten hidden board-state Subplots,
ten character cards, five Trojan Horse powers, and fifteen conflict tokens. It handles
movement, memories, conflicts, Acts, card effects, private-hand handoffs, undo,
local saves, and portable private replays. It is ready for designer testing;
rules fidelity and balance still need human playtesting. No remote multiplayer is included. Strategic bots can fill any seat. See [known rulings](docs/DECISIONS.md).

## Run it

Play in your browser at [the hosted prototype](https://mbancha.github.io/mightier-than-the-sword/). No installation is needed to play or use the Balance lab. GitHub Pages serves the same static build that contributors can run locally.

To work on the source locally, install Node.js 22.12 or newer, then open a terminal in this folder:

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

Choose Human or Strategic bot for each seat (the default is you versus one bot).
Click a starting page. Click your quill-and-inkwell to highlight adjacent pages,
then drag it or click a highlighted page. Each step uses one move; click the
figure again and choose **End move** when finished. You must move at least one
page and finish on a different page from where you started. Then click an empty
space to place an Inkling, or your own Inkling to choose a memory upgrade.
Character activation spaces offer your alternative action. Numbered spaces have
no automatic Twist reward. A full book triggers conflict immediately: play
a card from your hand or pass when each of your occupied spaces is checked from
left to right. Twists are only played in conflict. Player boards show every
upgrade level and highlight its current benefit. Start with 6 supply Inklings,
1 Twist and 1 hidden Subplot. Your Subplot and Twists share the hand limit. Build the required memory arrangement, track levels or current conflict position; no progress counters are used. A fulfilled objective is revealed automatically (at most one per player per turn).

Drag the empty map background to pan. Use the wheel or +/− to zoom; **Fit map**
frames the books. After a win, click a dashed publishing position, then a touching
book's overflow. **All legal actions** remains available for unusual card choices
and keyboard use. Bots can be paused or sped up; undo pauses bots for inspection.
Saves preserve seat controllers. Older saves require their matching rules release.

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
| `print/outputs/` | One master PDF with all printable components and rules |
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
all 20 sheets together. Its books have 2 mm margins; memory hexes are 0.75 inches
wide and conflict tokens are 1 inch square with mirrored backs.

Download the current [print-and-play PDF](print/outputs/Mightier_than_the_Sword_Current.pdf).

## Sharing

The GitHub repository and hosted prototype are public. Anyone with the link can
play; editing the source still requires repository access. The owner can invite
the co-designer under Settings → Collaborators. Both designers use separate
branches and review pull requests. GitHub Actions verifies changes and publishes
the current `main` build to GitHub Pages. Saves and Balance lab reports stay on
your device unless you download or share them yourself.

Framework provenance: selectively copied from the owner's BG-Prototypes template
(React/Vite setup and seeded randomness), then adapted into this independent app.
Game content and icons come from the existing Mightier prototype. No open-source
license is granted by this repository; retain third-party package licenses.

## Balance lab and headless simulations

Click **Balance lab** at the top of the app. Choose a game count (default 1,000),
player count or an even 2/3/4-player mix, first seed, and bot policy. Simulations
run in a background worker without drawing the table; your current game is
preserved and live bots are paused. Stop a run to view its completed batch.
Download the readable HTML report, full JSON, per-player CSV or statistics CSV.
Results disappear when the lab is closed unless downloaded.

Contributors can also run the same simulator without a browser:

```sh
npm run simulate
npm run simulate -- --games 2000 --players 4 --seed 100 --out artifacts/simulations/four-player
npm run simulate -- --games 300 --policy compare --seed 10001 --out artifacts/simulations/comparison
```

Defaults: 1,000 games, mixed player counts, all strategic bots, seed 1, 5,000
choices per game. `--help` lists options. On Windows use `npm.cmd` if needed.
The default report is `artifacts/simulations/latest/report.html`. JSON and CSV
files are saved beside it. Output folders are overwritten when reused; choose
`--out` to retain a previous experiment. The hosted Balance lab runs locally in
your browser; it does not send simulation results to a server.

Reports separate player counts and show sample sizes, character ownership and
conflict performance, starting/completed Subplots, book conflict outcomes, Twist
usage, turn order, points, turns, upgrades, completion counts and resources.
Comparison mode rotates one strategic bot through the seats against original
basic bots. See [simulation definitions and limitations](docs/SIMULATION.md).
