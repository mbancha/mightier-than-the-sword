# Fast collaborative editing

Start each session from current `main`, on a branch describing the change. Give
your assistant a concrete change and ask it to read AGENTS.md. It should not need
this conversation. Example: "Make Dracula cost two activation Inklings. Update
the current catalog, engine, focused tests and printable sheets. Open a PR."

## Common changes

| Change | Edit | Verify |
| --- | --- | --- |
| Wording/title/quote | `src/data/content.json` | Read cards; build app/PDF if published |
| Book slot count | `books[].slots` and `page_slots` | Even split, trigger tests, printed layout |
| Character power/capacity | `characters[].power`, `actions` counts | Character tests, printed card |
| Common resource/score numbers | `balance` | Corresponding rules/card text and tests |
| Token/Subplot reward | `tokenEffects`/`subplotEffects` and printed text | Reward tests and PDF |
| New conditional card effect | catalog text + `engine.ts` handler | Add an outcome-based test |
| Board layout | `App.tsx`/`styles.css` | Desktop/tablet smoke screenshots |
| Printed layout | `print/source/build.py` | Print checks and rendered pages |

Printed text and effect numbers live in one catalog, but are intentionally separate
fields: changing a number does not rewrite prose. Update both together. Conditional
Twist and character logic still needs TypeScript edits; do not promise that changing
card text alone changes the rules. Stable numeric catalog IDs must not be reordered.

Regenerate `docs/RULES.md` with `npm run docs`. Keep new rulings in DECISIONS.md.
Bump `rulesVersion` for a behavioral change; saves also verify exact content.

## Review and release

Keep each PR focused on one design experiment. State the trigger, old/new outcome,
and what was tested. Keep speculative ideas in an issue until chosen. Do not have
both designers' assistants edit the same working directory simultaneously.

Run `npm run verify` for a candidate release and inspect `artifacts/` screenshots.
Tag agreed playtest releases so a saved game can be reopened with matching rules.
CI attaches a static app build; hosting it is a separate decision. Private source
code and public playtest access should never be silently conflated.

## Immediate designer playtest

Play once with two players and once with four. Look closely at memory-return
costs, the weak-token reward pileup, shared memory chains, the last-conflict Act
boundary, and shoot-the-moon incentives. Save a private replay when something
feels wrong and describe the expected outcome alongside it.
