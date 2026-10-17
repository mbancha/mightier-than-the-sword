# Mightier than the Sword — digital redesign and proposed playtest content

Specification dated 2026-10-16. Digital implementation authorized. Print sync deferred.

## Authority and scope

The designer's rules below supersede the old digital rules. New names, powers, costs, card counts, and explicitly labeled defaults are proposals for the first playtest, not tested balance claims. Implement digital first; update PnP only after a later explicit print-sync request. Do not edit synced sources/ files. Current implementation lives in ../mtts/.

## 1. Confirmed rules

### Components, setup, and victory

- Keep the three sets: Voyages, Epics, Gothic Horror. Each has three books, three characters, five Subplot designs, and three Twist designs in this proposal.
- Shuffle each set's books independently; take one per set for the starting three-book map. Shuffle the six remaining books together.
- Every new book, including starting books, receives a random face-up bookmark in its upper-right corner. Bookmarks look like bookmarks and each has one power.
- Shuffle selected sets' characters together and deal each player one. This first character is their primary character, their protagonist. Additional characters are separate moving figures.
- Combine all selected sets' Twists and Subplots into one draw deck.
- Players start at seven ink. Remove player boards, memories, upgrade rows, reserves, shared Acts, and numeric victory points.
- First conflict at a book: winner permanently gains its bookmark; mark that book with a conflict token. Second conflict: winner takes that book into their tableau. These winners need not match. The second winner gets no extra bookmark.
- First to three books in two-player, or two books in three-/four-player, wins immediately.
- A claimed book leaves the map. In turn order starting with the current player, affected players move their characters off it, making one movement to the nearest book.
- If removal would disconnect the map and a book remains in the stack, the next book must replace the claimed book. When the stack is empty, place no replacement and no connector tile. If removal splits the map, the conflict winner closes the gap by rearranging the remaining books so every book touches at least two others, preserving the former orientation as closely as possible.

### Turns and chapters

- At the start of a player's turn, zero ink forces them to end their chapter. At three ink or fewer, they may voluntarily end it. Above three they cannot voluntarily end it.
- Ending a chapter consumes the turn: refill ink and place a new book if available. Ink reaching zero mid-turn or mid-conflict does not interrupt anything.
- If taking a turn with no available Inklings, choose a book with your Inklings and resolve a conflict there, as before.
- Normal turn: move all your characters one space, then choose one character from whose page all normal Inkling placements originate.
- Pay one ink to move a character one additional space. This can be improved by upgrades. There is no Panic mechanic.
- Place one Inkling for free. Use an available page space on the chosen character's page if possible; otherwise use that book's overflow.
- Pay one ink for one additional placement per turn initially; Subplots can raise the allowance. Both placements use the selected character's page and may independently purchase their occupied space's bonus.
- Every middle space in the book's complete left-to-right track has a bonus; the first and last spaces have none. Bonuses are optional and have printed ink costs, including zero for gain-ink spaces.
- Existing full-book conflict triggers, leftmost-Inkling ties, Twist opportunities, and ordinary post-conflict cleanup remain. New book text can explicitly override cleanup.
- At the end of any turn, refill hands below their minimum. Base minimum is one.

### Subplots and characters

- Subplots complete directly from hand upon a qualifying owned placement or a qualifying conflict. There is no active Subplot slot and no historical progress counter.
- A player may complete at most one Subplot per individual placement or conflict, rather than one per turn.
- Choose the printed ongoing benefit OR immediate reward upon completion. Subplots never grant characters.
- A Subplot can instead be played as a Twist for one ink and +1 power; the corresponding bookmark raises this to +2.
- Characters have printed power, a simple ability, and an ink cost where appropriate.
- Only the three extra-character bookmarks grant a second character. Character power increases from bookmarks affect the protagonist only.

## 2. Proposed operational defaults

These make implementation and testing concrete. They remain adjustable playtest rulings, not additional designer confirmations.

- Use seven as base ink capacity as well as starting ink. Gains cannot exceed capacity. A capacity increase does not itself refill ink.
- All 12 existing Inklings start available; there are no reserves. Ordinary erasure/cleanup returns pieces to supply. No new card uses suspension.
- Deal one card from the mixed deck at setup. At each turn end, check ALL players in turn order starting with the active player and draw up to each minimum. No maximum hand size.
- Paid extra movement is initially limited to once per turn total, allocated to one character. Base movement is mandatory when a legal move exists; increased movement is 'up to' its allowance after the first step.
- Chapter ending takes priority over forced conflict at zero ink. At one to three ink with no supply, choose chapter ending or the normal forced conflict.
- A chapter introduces a book at the existing legal publication sites. Retain the old geometric placement rule where possible, but remove the old publication bonus Inkling. Bridge replacement is immediate and separate from chapter ending.
- Starting characters are placed on chosen legal pages in turn order. A second character is drawn randomly from undealt characters and placed on the protagonist's page. Maximum two characters. With two already owned, an extra-character bookmark instead lets you replace your secondary character with the drawn one; no third figure. This fallback needs playtesting, since its value is lower.
- The four-space bookmark affects the protagonist only, following the primary-character distinction. Secondary characters keep their normal movement and printed abilities.
- Multiple-character relocation after a claim is chosen by each owner in turn order. Equal nearest destinations are owner choices. Evacuation is not normal turn movement and triggers no arrival abilities.
- All bonus Inkling placements use available supply. An optional multi-placement benefit requires enough supply for its full printed quantity before paying. Refund/cancel choices remain possible until payment commits.
- Only fresh placements grant space bonuses and placement Subplot checks. Moving an existing Inkling, including a bump, is a transfer and grants neither. A fresh placement caused by a book/character/card benefit is still a placement.
- Each owned placement is its own Subplot event, checked immediately after placement, before its rewards change the board. Only cards held at that event are eligible. An objective with a genre requirement must be triggered at that genre, as printed.
- Resolve a placement's selected Subplot reward and purchased bonus, then check for conflict. If that starts a conflict, finish it before resuming queued placements. Revalidate their destinations after book removal; if the source page disappeared, cancel remaining unspent optional placements rather than moving them to an invented destination.
- For a conflict, record start-state conditions before start effects. Check winning/result conditions after power and ties are resolved, before cleanup. Each participant can complete one qualifying conflict Subplot from cards held at conflict start. Resolve these rewards after the result is locked; they cannot change that result.
- Choose eligible Subplots explicitly; never automatically expose an unchosen hidden card. Each event can resolve only once for each eligible player. Cards drawn as that event's reward cannot complete retroactively on it.
- Completed ongoing Subplots remain face up and out of the deck. Immediate-reward Subplots and played combat cards enter the shared discard after their effects/conflict finish. Reshuffle discards only when needed. Completion grants no automatic replacement draw.
- Additive upgrades stack. Minimum-hand bookmark establishes a base of five, then add Subplot bonuses. Movement bookmark establishes protagonist base movement four, then add applicable bonuses. Ink capacity bonuses add to seven. Twist-cost bookmark sets printed Twist cost to one; no proposed discount reduces a paid card below one.
- Ordinary Inklings contribute one power. Only characters physically present contribute printed power. Overflow contributes power but grants no Twist opportunity. A Subplot-as-Twist uses a Twist opportunity; double-Twist bookmark permits two total combat cards, not two of each kind.
- At victory, stop further game effects. Otherwise do reward/cleanup/claim/evacuation/replacement in a documented sequence. All Inklings on a claimed book return to supply, including ones a first-conflict book effect would preserve.
- Remove the old neutral setup Inkling for this first playtest; reassess two-player pacing through play.

## 3. Bookmarks: 13 physical tokens, 11 powers

| Name | Copies | Proposed precise text |
| --- | ---: | --- |
| Larger Than Life | 1 | Your protagonist has +5 power. |
| Well Read | 1 | Your base minimum hand size is 5 instead of 1. |
| Deep Inkwell | 1 | Your ink capacity increases by 5. |
| Effortless Twists | 1 | Your Twist cards cost 1 ink each. |
| Hidden Strength | 1 | Your Subplots played as Twists give +2 power instead of +1. They still cost 1 ink. |
| An Unlikely Companion | 3 | Draw a second character and place them on your protagonist's page. |
| Strength in the Margins | 1 | Each of your overflow Inklings has +3 power. |
| Command the Page | 1 | Each of your page-space Inklings has +2 power. |
| Double Take | 1 | At each of your Twist opportunities, play up to 2 combat cards. Pay for each. |
| A Wider World | 1 | Your protagonist's base movement is up to 4 spaces instead of 1. |
| Make Room | 1 | You may place in an enemy-occupied space on your chosen page, moving that Inkling to this book's overflow, even if an empty space is available. |

Bookmark layout includes a short title, one power, and a persistent effect icon. No new bookmark is assigned to an already-contested book. Nine books use nine of the thirteen tokens in one game.

## 4. Nine proposed characters

Abilities belong to the named character, whether protagonist or secondary. 'Here' means that character's current book. All effects are optional unless stated otherwise. Once-per-turn means once during your own turn; once-per-conflict means each conflict at that character's book.

| Set | Character | Power | Ability |
| --- | --- | ---: | --- |
| Voyages | Captain Nemo | 2 | **Hidden Passage:** After Nemo finishes normal movement, move up to 2 of your overflow Inklings from other books into this book's overflow. Free; once per turn. |
| Voyages | Phileas Fogg | 1 | **Right on Time:** When you buy extra movement for Fogg, that purchase moves him up to 2 spaces instead of 1. |
| Voyages | Ichthyosaur | 3 | **From the Depths:** In a conflict here, if you have at least 2 overflow Inklings here, Ichthyosaur has +2 power. The figure occupies one page like other characters. |
| Epics | Achilles | 3 | **Worthy Opponent:** Achilles has +2 power in a conflict here if an opponent has a character here. |
| Epics | Odysseus | 1 | **A Plan Within a Plan:** Once per conflict here, after you play a combat card, draw 1 card. |
| Epics | Aeneas | 2 | **Carry Them Home:** After Aeneas finishes normal movement, you may pay 1 ink to move up to 2 of your page-space Inklings from other books into this book's overflow. Once per turn; transfers grant no rewards. |
| Gothic Horror | Dracula | 2 | **Guests for Dinner:** Dracula has +1 power for each opposing player participating in this book's conflict. |
| Gothic Horror | Frankenstein's Creature | 1 | **Built from Scraps:** Once per turn, after a normal placement from the Creature, you may pay 1 ink to place 2 Inklings from supply into this book's overflow. This does not use your paid extra-placement allowance. |
| Gothic Horror | Dr. Jekyll / Mr. Hyde | 1 | **The Other Self:** At the start of a conflict here, you may pay 1 ink to give this character +3 power for this conflict. |

This keeps the existing Nemo/Fogg/Ichthyosaur trio, simplifies the Gothic trio, and uses Aeneas alongside Achilles and Odysseus to represent all three Epic books. Retire Agamemnon and the Trojan Horse from the new playable roster; archive old identities without reusing their stable IDs for new characters.

## 5. Books, printed costs, and thematic effects

Preserve existing space counts, page splits, orientation, and book identities. Number spaces left to right across the whole book. Space 1 and the final space have no purchasable bonus. Every other space does. Display costs even when zero.

For initial balance, use stronger-value middle bonuses toward the left. Cards and overflow are alternative strategic values, so 'better' is not a strict numerical ordering. Only three of nine books have an ink-gain space, each giving just one ink; no recurring ink income is printed on characters.

| Book | Total spaces / split | Middle-space bonuses in left-to-right order |
| --- | --- | --- |
| 20,000 Leagues Under the Sea | 3 / 1+2 | #2: pay 1 ink, draw 2 cards |
| Around the World in 80 Days | 4 / 2+2 | #2: pay 0, gain 1 ink; #3: pay 2 ink, draw 2 cards |
| Journey to the Center of the Earth | 5 / 2+3 | #2: pay 2 ink, add 3 Inklings to local overflow; #3: pay 2 ink, draw 2 cards; #4: pay 1 ink, draw 1 card |
| The Odyssey | 5 / 3+2 | #2: pay 0, gain 1 ink; #3: pay 2 ink, draw 2 cards; #4: pay 1 ink, draw 1 card |
| The Iliad | 4 / 2+2 | #2: pay 2 ink, add 3 Inklings to local overflow; #3: pay 2 ink, draw 2 cards |
| The Aeneid | 3 / 1+2 | #2: pay 2 ink, draw 3 cards |
| Dracula | 4 / 2+2 | #2: pay 0, gain 1 ink; #3: pay 3 ink, draw 2 cards |
| Frankenstein | 5 / 2+3 | #2: pay 2 ink, add 3 Inklings to local overflow; #3: pay 3 ink, draw 3 cards; #4: pay 4 ink, draw 3 cards |
| Dr. Jekyll and Mr. Hyde | 3 / 1+2 | #2: pay 1 ink, draw 2 cards |

### One effect category per book

Every book has exactly one category badge and one thematic effect. Three books use special spaces. Those spaces carry the same thematic symbol as their book effect. Special-space effects are separate from purchased bonuses; even an endpoint with no bonus may carry a special-space symbol.

| Book | Category / icon | Proposed effect |
| --- | --- | --- |
| 20,000 Leagues Under the Sea | Special space / submarine | Mark #2 **Diving Hatch**. After placing here, you may move 1 of your Inklings from any other book's overflow to this book's overflow. Free; transfer, not placement. |
| Around the World in 80 Days | Movement end / footsteps | **Express Connection:** After a character finishes normal movement here from a different book, its owner may move 1 of their other characters 1 space. Once per player turn. This bonus movement triggers no arrival effect. |
| Journey to the Center of the Earth | Conflict / crossed swords | **Hidden Depths:** Overflow Inklings here have +1 power each during conflict. This adds to other power bonuses. |
| The Odyssey | Movement end / footsteps | **Stories from Afar:** After a character finishes normal movement here from a different book, its owner may discard 1 card to draw 1 card. Once per player turn. |
| The Iliad | Conflict / crossed swords | **Heroes of Troy:** Every character here has +1 power during conflict. |
| The Aeneid | Movement end / footsteps | **A New Homeland:** After a character finishes normal movement here from a different book, its owner may move 1 of their Inklings from another book's overflow into this book's overflow. Once per player turn. |
| Dracula | Special space / castle | Mark #1 **Castle**. At conflict start, its occupant may move 1 opposing page-space Inkling here into this book's overflow. This does not cancel the already-triggered conflict. |
| Frankenstein | Conflict / crossed swords | **It Lives Again:** After this book's first conflict, return existing overflow Inklings to supply, then move its page-space Inklings into overflow instead of returning them. After its second conflict, return all Inklings normally as the book is claimed. |
| Dr. Jekyll and Mr. Hyde | Special space / split mask | Mark #2 **The Laboratory**. After placing here, you may discard 1 card to add 1 Inkling from supply to this book's overflow. No ink cost. |

Movement-end effects resolve after a character's complete normal route, including paid steps, not after each intermediate step. Resolve characters sequentially in the owner's chosen order. Book movement effects cannot chain themselves through granted bonus movement, setup, or evacuation. Special-space effects resolve once for the fresh placement; the Laboratory cannot trigger itself because its bonus goes to overflow.

## 6. Fifteen proposed Subplots

Two copies of each design. Choose one printed reward at completion. All counts refer to your own Inklings unless explicitly stated otherwise. 'Here' is the triggering book. Conditions use board snapshots, not historical counters. Placement objectives must include a fresh Inkling at the named trigger; a completed arrangement alone does not claim a card.

All ongoing rewards are modest compared with bookmarks. A copied ongoing card cannot be chosen twice by the same player: if that named ongoing benefit is already owned, use the immediate option. Different named benefits may stack. Paid extra placements/movement remain limited by their allowances and cost one ink per purchase unless an effect explicitly says otherwise.

### Voyages — spread out, travel, and work from overflow

| Subplot | Trigger and objective | Ongoing reward | Immediate reward |
| --- | --- | --- | --- |
| Across the Map | Place in a Voyages book while you have Inklings on at least 3 different books, including this one. | **Long Strides:** Your protagonist gets +1 normal movement allowance. | Draw 3 cards. |
| A Foot on Each Shore | Place in a Voyages page space so you occupy at least one space on each of this book's two pages. | **Well Prepared:** Minimum hand size +1. | Gain 2 ink. |
| Below the Surface | Place in a Voyages book's overflow so you have at least 3 overflow Inklings here and at least 1 page-space Inkling here. | **Deep Reserves:** Ink capacity +2. | Draw 3 cards. |
| A Connected Journey | Place in a Voyages book while you have Inklings in it and in a different, edge-adjacent Voyages book. | **Another Step:** Increase paid extra-movement purchases per turn by 1. | Gain 2 ink. |
| Out of Your Depth | Participate in a Voyages conflict with at least 2 overflow Inklings here at conflict start. Winning is not required. | **Seasoned Crew:** Your protagonist has +1 power when you have overflow Inklings at its conflict book. | Draw 2 cards. |

### Epics — occupy the line, contest heroes, and earn victories

| Subplot | Trigger and objective | Ongoing reward | Immediate reward |
| Hold the Line | Place in an Epics page space so you occupy at least 2 consecutive spaces in this book's left-to-right track. The sequence may cross the fold. | **Reinforcements:** Increase paid extra-placement allowance per turn by 1. | Draw 2 cards. |
| The First and Last Word | Place in an Epics book's first or last space while you also occupy its other endpoint. | **Heroic Stature:** Your protagonist has +1 power. | Gain 2 ink. |
| Muster the Host | Place in an Epics book so you have at least 3 Inklings here, including at least 1 in a page space and 1 in overflow. | **A Second Wave:** Once per turn when buying an extra normal placement, you may put that purchased Inkling in the same book's overflow even if a page space is available. | Draw 3 cards. |
| A Worthy Rival | Win an Epics conflict where your protagonist and an enemy character were both present at conflict start. | **Tactical Reserve:** Minimum hand size +1. | Gain 2 ink. |
| A Deed Remembered | Win a conflict in an Epics book that already had a conflict token at conflict start. | **Veteran Commander:** Once per conflict at your protagonist's book, after playing a combat card, you may discard 1 card to draw 1. | Draw 4 cards. |

### Gothic Horror — uneasy arrangements and strength at a cost

| Subplot | Trigger and objective | Ongoing reward | Immediate reward |
| An Unwelcome Guest | Place in a Gothic Horror page space so one of your spaces is immediately next to an enemy-occupied space in the same book's track. | **Unsettling Presence:** Your protagonist has +1 power when an opposing character is at its conflict book. | Draw 2 cards. |
| In the Margins | Place in a Gothic Horror book so you have at least 1 page-space Inkling and at least 2 overflow Inklings here. | **Working in Secret:** Increase paid extra-placement allowance per turn by 1. | Gain 2 ink. |
| A House Divided | Place in a Gothic Horror page space so you occupy 2 nonconsecutive spaces here with an enemy-occupied space somewhere between them. | **Forbidden Reading:** Minimum hand size +1. | Draw 3 cards. |
| Something in the Cellar | Participate in a Gothic Horror conflict where you have at least 2 overflow Inklings and an opponent has at least 2 page-space Inklings at conflict start. | **A Larger Vessel:** Ink capacity +2. | Gain 2 ink. |
| The Last Candle | Win a Gothic Horror conflict with 2 ink or fewer when the result is determined. | **Dangerous Experiment:** Increase paid extra-movement purchases per turn by 1. | Draw 3 cards. |

Difficulty intent: each set has accessible positioning goals, a goal requiring earlier setup, and conflict goals. A Connected Journey intentionally waits for a second Voyages book; A Deed Remembered waits for a second conflict. Neither is dead in hand because any Subplot remains a one-ink combat card. Completion rewards do not create new characters or unlimited recurring ink.

## 7. Nine proposed Twists

Five copies of each. All are played during your normal Twist opportunity and last for the current conflict. Conditions are checked when played. Conditional values replace, rather than add to, the fallback value. None requires the matching genre to be played, so every mixed-deck draw remains useful.

| Set | Twist | Ink | Effect |
| --- | --- | ---: | --- |
| Voyages | Travelling Light | 1 | Gain +4 power if you have exactly 1 Inkling here; otherwise +2. |
| Voyages | All Hands on Deck | 2 | Gain +2 power, plus +1 for each of your overflow Inklings here, to a maximum of +5 total. |
| Voyages | The Long Way Round | 3 | Gain +6 power if you have Inklings on at least 3 different books; otherwise +4. |
| Epics | A Hero Provoked | 1 | Gain +3 power if your protagonist is here; otherwise +2. |
| Epics | Hold Fast | 2 | Gain +5 power if you occupy at least 2 consecutive page spaces here; otherwise +3. |
| Epics | Against All Odds | 3 | Gain +7 power if any one opponent has more Inklings here than you; otherwise +4. |
| Gothic Horror | A Shadow at the Door | 1 | Gain +3 power if an opponent has a character here; otherwise +2. |
| Gothic Horror | It Was Alive | 2 | Gain +5 power if you have both page-space and overflow Inklings here; otherwise +3. |
| Gothic Horror | The Final Transformation | 3 | Gain +6 power; gain +8 instead if paying this card's cost left you at zero ink. |

These deliberately simple first-pass Twists reward the sets' positions without introducing erasure, additional nested conflicts, or elaborate reaction windows. Direct combat interaction still comes from competition for spaces, the castle, and the bumping bookmark. Test whether numerical Twists provide sufficient drama before adding more complicated effects.

### Deck composition

- Each set: 3 Twist designs x 5 copies = 15 Twists; 5 Subplot designs x 2 copies = 10 Subplots.
- All three sets: 45 Twists + 30 Subplots = **75 cards, exactly 60% / 40%**.
- Unique designs: 9 Twists and 15 Subplots. Copies have distinct physical IDs but share design IDs.
- Ongoing Subplots leave circulation, so the in-play deck's ratio will naturally change. The 60/40 target applies to setup composition.

## 8. Remaining structural checks, not hidden rule changes

1. **Three-book endpoint:** With nine total books and immediate victory at 3/2 collected books, exactly three remaining map books is not guaranteed. If all nine are published, at most five can have been collected when a game ends at the supported player counts, leaving at least four. Games can end before publication is exhausted. Keep the confirmed victory thresholds; do not enforce a three-book endpoint.
2. **Gap closing — confirmed:** The conflict winner rearranges remaining books after a split with an empty stack. Every book must touch at least two others; retain the previous orientation as closely as possible. Provide a suggested compact layout plus manual adjustments and require the winner to accept a valid layout. Book/page identities, contents, and character locations follow the moved books.
3. **No legal forced conflict:** With all 12 pieces available initially and ordinary cleanup returning them, 'no supply and no owned board Inkling' should be impossible absent a bug. Check the invariant rather than reintroducing reserves.
4. **No legal publication site:** Book removal may make the old 'touch two books' rule impossible. Proposed fallback: if no empty site touches two books, allow a site touching one. Do not add it invisibly; record it as a playtest default.
5. **Extra-character bookmarks after two characters:** The replacement fallback above is provisional. Preserve the three tokens; test their value when the recipient already has two.

## 9. Digital implementation plan

### A. Freeze specification and audit

Read repository instructions and current checkout state. Preserve unrelated changes. On the implementation branch, copy confirmed rules into decisions, record provisional defaults, and version this as a new rules edition. Audit every old effect for memories, Quills, reserves, suspension, plot points, shared Acts, old character acquisition, separate decks, and free per-turn draws. Implementation is authorized; publishing and merging require the applicable user authorization.

### B. Replace state and core turn flow

Implement per-player ink/capacity, chapter count, protagonist identity, optional secondary character, upgrades, and collected books. Introduce mixed physical card instances, shared draw/discard, independent book conflict state, and bookmark pool. Preserve seeded randomness, atomic legal actions, pending choices, undo, and hidden information. Old saves should receive a clear incompatible-edition message rather than a guessed migration.

Build setup, mandatory character movement, optional paid steps, source-character selection, ordinary/extra placements, priced bonuses, chapter turns, and all-player minimum-hand refill. Keep character/page selection reversible until the game action is committed.

### C. Conflicts, book claims, and topology

Keep ordinary conflict participation, ordered page-space Twist opportunities, leftmost ties, and cleanup; replace point rewards with first-conflict bookmarks and second-conflict claims. Add immutable conflict-event snapshots for Subplots. Implement actual book removal without reindexing surviving book/page identities. Recompute adjacency, nearest-book evacuation choices, connectivity, bridge replacement, and victory. Handle queued choices whose target vanished.

### D. Add all proposed content

Implement the nine character abilities, thirteen bookmarks, book bonus tables, nine thematic book effects, fifteen Subplots with both reward branches, and nine Twists with physical copy counts. Use explicit effect handlers and catalog fields; do not introduce an unrelated universal rules engine. Preserve legacy catalog identity history and give new designs new IDs.

### E. Interface

Replace player boards with compact ink tracks and character/upgrade/book tableaux. Label the protagonist distinctly. Show costs, movement/placement allowances, hand minimum, and chapter-ending eligibility. Show bookmark silhouettes at each book's upper right and a clear first-conflict marker. Match special-space symbols to their book effect; use crossed swords for conflict effects and footsteps for movement-end effects. Show free endpoint spaces without reward icons. Support private handoff, accessible text labels, desktop/tablet controls, clear completion choices, and a readable action log.

### F. Verification and documentation

Update focused tests and existing bot heuristics for the new economy and book goals. Remove obsolete test assertions while preserving useful privacy, topology, undo, and action-legality tests. Run required tests, build, browser smoke, and inspect desktop/tablet views. Regenerate digital rules/help after the catalog changes, update source audit and verification evidence. Do not regenerate PDFs.

Required scenarios: zero ink on someone else's turn; chapter turn versus forced conflict; capacity without free ink; both character movements with placement from one; bought bonuses on both placements; extra-allowance stacking; one Subplot per event but multiple events per turn; conflict reward after result lock; simultaneous all-player refills; discarded versus ongoing Subplots; shuffled-deck exhaustion; bumping/transfer versus placement rewards; castle removal of a Twist opportunity; Frankenstein first versus second cleanup; mandatory bridge replacement; empty stack with split map; evacuation ordering; no legal publication sites; max-two-character fallback; winning claim; privacy and save/undo.

### G. Playtest tuning, then PnP

Measure chapter length, ink gain/spend, forced-conflict frequency, Subplot completion rates, player-count pacing, and bookmark win rates. Pay particular attention to overflow stacking, primary-character +5 power, cheap high-cost Twists, extra placement plus overflow bonuses, and all-player hand refill. Automation verifies rules and detects stalls; it does not establish balance. After digital designer testing, separately authorize PnP updates using the settled content.

## 10. Implementation handoff

Use this document as the consolidated redesign specification, with section 1 as designer-confirmed rules and sections 2–8 as explicitly proposed playtest content/rulings. Implement sections 9A–F in the current mtts project, retaining protected references and print artifacts. Do not treat older docs as overriding this redesign. Apply the confirmed gap-closing rule after a split; do not add connector tiles or movement shortcuts. Do not publish or merge without the applicable user authorization. Report implemented rules, provisional rulings, verification evidence, and remaining limitations separately.
