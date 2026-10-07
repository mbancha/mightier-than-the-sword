# Source audit

Source edition: Mightier_than_the_Sword_Playtest_v15.pdf and its inspected local
generators/content, after the designer's foreshadow/Inkling and enlarged-book edits.
The PDF snapshot is kept under print/outputs. No old Google Doc rule has been
silently reintroduced. Earlier variants are not part of this build.

| Family | Expected / supplied | Imported | Automation |
| --- | --- | --- | --- |
| Books | 9 / 9 | 9 | Two-page movement, slots, all printed effects |
| Twists | 15 / 15 | 15 | All 15 effect handlers |
| Incremental Subplots | 10 / 10 | 10 | Event progress, reward choice, replacement |
| Characters | 10 / 10 | 10 | Capacity, movement, power and passives |
| Horse powers | 5 / 5 | 5 | Hidden choice and reveal |
| Conflict tokens | 15 / 15 | 15 | Pools, strong/weak rewards, multiplier lifecycle |
| Memory categories | 4 / 4 | 4 | Per-owner/per-placer rewards and return cost |
| Player colors | 4 / 4 | 4 | Distinct colors, symbols and seat numbers |
| Icons | 17 / 17 | 17 SVG + PNG masters | Original assets reused |

All component entries are present. This is not a rules-complete certification;
the interaction boundaries in DECISIONS.md require designer review. Component
array positions are the stable IDs for this initial release.

## Provenance and rights

- Rules and component designs: supplied/developed in the owner's Mightier project.
- Icons: original vector drawings created in that project; no external image APIs.
- Literary quotations: inherited exactly from v15, with its source URLs retained
  in `content.sources`. Translation/source rights have not been independently
  re-audited for public distribution in this turn.
- Framework: owner's local BG-Prototypes template. Only the toolchain files and
  seeded RNG are directly copied; architecture conventions were followed.
- npm packages: retain upstream licenses. The designers chose to make the
  repository public for GitHub Pages; this does not grant an open-source or
  commercial-use license. Literary quotation rights for public distribution
  have not been independently re-audited.

## Digital revision 0.2

Latest designer instructions supersede the v15 setup: only three books initially,
hex-grid publication after conflicts, edge-by-edge movement, optional bot seats,
and tactile piece interactions. Component counts and card text are unchanged.
The shared rules catalog and generated current PDF include this revision; the
approved v15 snapshot remains an immutable historical reference.

## Digital and print revision 0.3

Mandatory movement, direct space placement/upgrading, middle-space Twist rewards,
immediate conflicts and per-space left-to-right conflict windows follow the latest
designer instructions. Agamemnon retains the explicitly approved one-empty-space
trigger exception. All 15 Twists now use conflict timing; IDs 8-14 were adapted,
and Agamemnon/Strategists text specifies their once-per-conflict extra card.
The app, generated rules and current 16-page PDF read this same catalog. Book
sheets now show middle-space Twist symbols. Counts and the v15 snapshot stay intact.

Starting Subplots are unchanged in the rules and PDF: every player receives one.
The digital board now displays the full objective and reward by default.

## Bot and simulation update

Rules and all printed component text remain edition 0.3, unchanged. Strategy
uses the same stable catalog identities. Optional structured engine events feed
the new simulator; the PDF needs no regeneration for this software-only update.
Reports retain the rules version, catalog fingerprint, bot version and seed range.

## Digital-only revision 0.4

Latest designer edits replace all nine book effects, swap Beowulf for The Aeneid, change setup and the combined hand limit, and remove middle-space Twist rewards. Character IDs remain unchanged (there was no Beowulf character). A new original castle SVG marks Dracula’s first slot. Rules and live catalog updated; all print files deliberately unchanged pending an explicit print-sync request.

## Digital revision 0.5

All ten Subplot objectives replaced under the designer’s hidden-objective correction. Rewards and numeric IDs remain stable. Public event counters removed from state, engine, UI and bots. Rules and digital content updated; print source and outputs intentionally untouched. Earlier audit sections describe historical editions only.


## Edition 0.6 designer changes (2026-10-05)

The designer request in this task supersedes earlier player-piece terminology and the final Curiosity/Valor/Insight benefits and all four Resolve tiers. The catalog, engine, private views, labels, bot choices, generated rules, and master PDF share edition 0.6. Print layout overrides that contradicted the catalog were removed: middle-space Twist symbols, submarine erasure, and cramped upgrade text. Printed objectives use the current hidden board-state predicates. The master includes the complete rules, icon legend, nine books, 40 cards, four player boards, scoreboard, 48 memories, conflict-token fronts/backs, and a player-piece sheet. Insight preserves the one-active-Subplot interpretation pending clarification, documented in DECISIONS.md.


The 2026-10-06 print-only layout revision packs two player boards per sheet. All four boards were compared against the previous master by extracted word counts: no words added or removed. The source catalog and digital game are unchanged.


## 2026-10-07 integration

Reviewed source branch f2039f8 against main 232391a and integrated its rules overhaul with the fifteen designer-approved placement objectives. Shared content is the digital/print authority; rules and the single master PDF are regenerated. Stable IDs 0-9 are replaced in place; 10-14 are appended. Old hidden-state/hand-limit/token tests are migrated to the superseding rules, while applicable prior tests remain. Added focused objective, ranking, neutral, turn ordering, retained-card, draw and deadlock regressions.


## One memory per book (2026-10-07)

Updated stable Subplot ID 10, placement predicate and legal upgrade choices for the one-owned-memory-per-book limit. Catalog/rules edition advances to 0.7.1; print master is synced.
