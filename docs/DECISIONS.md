# Current rulings and open playtest questions

Authority: latest explicit designer decisions → v15 catalog/rules → provisional
digital rulings here. Earlier Acts/bookmarks/plotlines/sidekick variants are retired.
This file is for decisions, not a transcript. Date: 2026-09-30.

## Confirmed source behavior

1. Two pages per book, with 3–5 slots split as evenly as possible. Figures occupy
   pages, not slots. Overflow belongs to the whole book; the submarine suspends incoming overflow Inklings.
2. Every conflict takes a current-Act token. Only an uncovered +3 space scores
   `3 × new token's Act`; covered books score zero printed points. All face-up
   token rewards are collected in the winner's chosen order and flip weak.
3. The final selected token ends the Act after its rewards. Old tokens flip strong
   at the next Act, +3 spaces uncover, the reserve releases, and character-card
   Inklings return. Book Inklings stay until erased by a conflict or effect.
4. Memories suspend the replaced Inkling, leave a reusable empty slot, and add no
   power. The placer and owner gain their reward, once total if the same player.
5. Erase returns an Inkling to supply; suspend sends it to the next reserve (out
   of play during Act III); foreshadow takes from the next reserve into supply.
6. An Unlikely Champion costs returning your memory from the conflict book.
   Return it to the rightmost uncovered matching row space. Its occupant stays.
7. Combat Twists stay out of the draw/discard piles until combat is scored, so an
   Odysseus draw cannot recycle a Twist still being used in that same combat.
8. Complete a Subplot, resolve its chosen reward, then draw a new one. The new
   Subplot does not retroactively count the triggering event or that reward.

## Provisional implementation choices to review through play

- Character actions that say "up to" include staying. Local erasure can target
  numbered slots on the character's page or the shared overflow.
- The Outcast's Revenge can erase on any other book, including shared overflow.
- A figure between books contributes to both books but occupies neither slot.
  Its sole printed activation relocates it between another legal pair.
- Optional erasures/placements and Frankenstein collection show an explicit skip.
  An effect without a legal target does nothing, except the printed extra-upgrade
  fallback of 2 points and exhausted-deck/reserve fallbacks.
- If multiple after-conflict effects apply, resolve in participant order; the
  active player is first in ties. The winner chooses token reward order.
- The last conflict still runs the active player's end-turn Frankenstein move and
  hand-limit discard before the Act refresh; further full books wait until the
  next turn. This follows the printed end-turn and last-token instructions together.
- The former Odyssey row-count reward is retired in digital edition 0.4.

## Scope boundaries

The game is automated for the imported set; tests and first browser journeys are
not a designer sign-off. No network multiplayer, matchmaking or published balance
claims. The prototype is hosted on GitHub Pages. Strategic bots are playable
opponents; their heuristics and simulations are not proof of balance.

## Growing-map revision (designer confirmed)

- Start with three random books: two in the top row, one centered underneath.
  All book positions follow a hexagonal grid; orientations remain horizontal.
- After every conflict, the winner draws the next random book, chooses an empty
  site adjacent to at least two books, and places one supply Inkling in an
  existing neighboring book's overflow. This includes the last conflict of an Act.
- Crossing a touching page edge or the internal fold costs one movement point.
  Normal movement can stop early after at least one step, on a different page from its start; a legal drag uses a single step at a time.
- Each seat can be human or a basic bot. Bots must use only their own private view.

Provisional edge cases: shuffle all nine books together (no genre quota); when
all books are published, skip publication and its bonus. No supply means no
publication Inkling. Choosing submarine overflow suspends that Inkling.
Shoot-the-moon awards no publication because it is not a conflict. Publish after
token rewards, before other full books or an Act transition. Travel Subplots count
at most one new-book travel event per normal movement, even with several steps.

## Space-check revision 0.3 (historical; 0.4 changes below supersede it)

- Normal Quill movement is mandatory and must finish on a different page.
  Optional movement granted by characters and effects remains optional.
- After movement, an empty numbered space can be clicked to place directly;
  clicking your own Inkling offers a memory upgrade, suspending that Inkling.
- Every numbered space except the first and last across the book grants one Twist
  on placement, including bonus placements. Moving an existing Inkling does not.
- Finish rewards earned by the filling placement, then interrupt further
  placements to resolve conflict immediately. Memories alone never fill a space.
- Agamemnon explicitly triggers conflict with one space empty. He occupies no
  numbered space and grants no Twist opportunity for the empty space.
- All 15 Twists are conflict-only. Check numbered spaces once, left to right;
  the current Inkling owner may play one Twist or pass at each occupied space.
  Overflow and memory-only spaces grant no opportunity. A player may play at
  several separate spaces. Agamemnon/Strategists grant one extra Twist at one
  owned space check per conflict, not cumulative extra cards at every space.
- Later checks use their current occupants after card effects. Earlier spaces
  never repeat. The current check remains available if its Inkling is erased
  during that check; conflict finishes even if effects empty numbered spaces.
- Other books filled during conflict wait until it finishes. If the final token
  ends the Act, waiting full books resolve before the next normal movement.
- Seven former turn Twists were adapted to this timing: Mathematical Leap,
  An Ocean Without Borders, Crossing the Threshold, Divine Favor, An Unlikely
  Champion, Stolen Vitality and A Hero Returns. Stable catalog IDs are retained.

The ordering of earned placement rewards before the immediate conflict and the
latched current-space opportunity are implementation rulings recorded explicitly
for playtest review. Other new movement/timing rules above are designer confirmed.

## Starting Subplots

Every player, human or bot, begins with one hidden Subplot drawn from the shuffled core deck. Only its owner sees it. The former public counter system is superseded by revision 0.5 below.

## Strategic bots and simulations

No game rules changed. All bot seats now use the strategic heuristic policy.
The original policy is retained only as a simulation baseline. All simulations
use the normal engine and private-player boundaries. Default batch: 1,000 games,
balanced as closely as possible across 2/3/4 players, seeds starting at 1.
Comparison mode rotates one strategic seat against original bots. Statistics
are descriptive playtest evidence, not automated declarations of overpowering.

## Browser-hosted prototype

The designers chose to make this repository public so GitHub Pages can serve the
game on their current GitHub plan. The site publishes the `main` production build
through GitHub Actions; it does not add a multiplayer server. Games, private
saves and Balance lab simulations remain local to each player's browser unless
the player explicitly downloads or shares a file. Source changes still go
through branches and pull requests.

## Digital revision 0.4

Print outputs change only on an explicit print-sync request. They were synchronized to the shared 0.5 catalog on 2026-10-01. Earlier saves still require their matching rules release.

Start with 6 supply Inklings, 1 Twist and 1 Subplot. The Insight limit covers Twists plus the held Subplot. Middle spaces no longer grant Twists. The nine books now use only the new designer effects; The Aeneid replaces Beowulf at its former stable book ID. No Beowulf character existed in the deck. Agamemnon and Odysseus retain two activations each and their confirmed passives.

Provisional defaults stated during implementation (not designer-confirmed answers): keep 3 Inklings in each later reserve (12 total); Dracula's first space is the castle; allow discarding the active Subplot, losing progress without replacement. Frankenstein erases old overflow, then moves numbered-space Inklings into overflow where they survive. Jekyll can reduce points below zero.

Dracula's castle owner receives one optional erasure before Twist checks, of any Inkling on that book. Around the World placement effects include overflow and bonus placements and can move any owned figure one page; resolve these rewards before checking for conflict. Moving existing Inklings is not placement. The submarine suspends every incoming overflow Inkling, including transfers and Nemo's activation Inklings; this is not erasure. The Aeneid suspends both numbered and overflow Inklings at cleanup.

Odyssey rewards the moving figure's owner when it leaves for another book, on normal or ability movement. Internal page moves and setup do not reward. Direct destination choices follow a deterministic shortest page route; step controls allow a chosen route. Ichthyosaur only leaves Odyssey when neither of its occupied pages remains there. Journey overflow contributes 2 power per Inkling. Iliad adds 1 per contributing character and Quill, including a Quill at Valor 0.

## Hidden Subplots — digital revision 0.5

Designer correction: incremental means working toward a hidden objective, not marking public event counters. All ten objectives now check simultaneous current arrangements: owned memories, track levels, Quill/character location, Inkling occupancy, or participation in the current conflict. Existing pieces count and returned memories can break an unfinished arrangement. No historical participation counters remain. Rewards retain the character-or-alternative choice and replacement draw.

Implementation rulings: fulfillment is checked automatically after each action and automatic effect, before conflict cleanup. Completed objectives are revealed; unfinished cards never enter public/opponent views. At most one completion per player per player turn, including the Horse completion power, prevents a replacement-draw loop over already fulfilled conditions. Replacements can complete from the next turn. Setup does not complete objectives. These timing and frequency rulings are provisional for playtesting. Printed artifacts are unchanged.


## Digital and print revision 0.6 (2026-10-05)

Designer-confirmed: player pieces are Quills. Named literary character cards retain their own category. Final Curiosity moves up to 5 pages; final Valor gives the Quill 2 power plus 1 for each owned Inkling in its book (numbered and overflow). Final Insight keeps combined hand limit 6 and offers optional end-turn draws until 4 combined cards. Resolve offers any available tier: one normal placement; two in local overflow; one normal plus one in local overflow; or up to three split across the Quill's page and directly adjacent pages. Tiers correspond to base plus three memory upgrades. No Twist-discard placement boost remains.

Implementation interpretation pending designer clarification: Insight offers Twist draws and a Subplot draw only when no active Subplot is held, preserving the existing one-active-Subplot rule. It never replaces an existing objective. Draws occur after end-turn character movement, before hand-limit discard. A depleted deck without discards offers no draw. Normal Resolve placement follows the current empty-space/overflow rule; placement effects and immediate conflicts still interrupt remaining placements. Available tiers are alternatives, not cumulative benefits.

The master PDF now matches the digital catalog, including all 0.4 book effects and 0.5 hidden objectives. `print/outputs/` contains only `Mightier_than_the_Sword_Current.pdf`. Old editions and Component Studio image exports are removed from tracked output; Git history retains them. Future image exports go to ignored `artifacts/`.


## Repository cleanup (2026-10-05)

Designer requested removal of obsolete folders. `assets/` duplicated all 17 active SVGs in `public/icons/`; byte equality was verified before removal. `public/icons/` is now the canonical exported icon set, with the provenance manifest moved there and its paths corrected. Print still draws the retained original vector source. The unused Component Studio exporter referenced missing `tts/assets` and is removed. Current source, documentation, print generator, tests, and GitHub workflows remain active. Print output contains only the current master PDF.


## Half-sheet player boards (2026-10-06)

Designer requested two boards per Letter sheet with all details retained. Player-board rows are compacted vertically while the 0.75-inch memory slots remain full-size. Every base benefit, upgrade, memory reward, instruction and Act reserve reminder is unchanged. The single master PDF is now 18 pages; token fronts/backs are pages 17-18. Print inline-layout resources are generated in ignored artifacts from the retained vector source, so regeneration no longer depends on the removed assets folder.


## Rules overhaul and placement Subplots 0.7 (2026-10-07)

Designer authorized integrating codex/rules-overhaul-2026-10-07 and fifteen approved replacement objectives. Page spaces replace numbered spaces; binding spaces replace overflow. All ordinary Subplot completions require an owned fresh placement, with the predicate evaluated immediately after placement, before memory/book rewards or conflict effects. Transfers, Quill movement, memory upgrades, card draws and forced conflicts cannot fulfill the objectives. A placement on a memory space uses any memory type and ownership only where stated. Binding is book-wide, never assigned to a page. Opening/Last Word compare the placed page's endpoint with any page endpoint on an edge-adjacent book. The previous Horse condition-override power remains an explicit exception.

The supplied overhaul changes normal turns to placement followed by an optional memory, character actions to memory landing only, no hand limit, end-turn Insight Twist draws, retained card points, first/second token scoring, repeated flipped tokens, and no-supply forced conflicts. Neutral setup Inklings occupy a page space in two-player games without power or participation. The submarine redirects binding arrivals to an adjacent book. Resolve alternatives and immediate-conflict interruptions remain available. Existing alternative rewards/end-game values at IDs 0-9 are preserved; new IDs 10-14 extend their existing reward mix.

Review fixes: neutral spaces reject placement; the neutral piece is visible and printable; Resolve menu is reachable; submarine placement and transfer redirects preserve resources; conflict ranking is captured before cleanup; source edition and save compatibility advance to 0.7. End-turn draws follow the supplied Your turn rule (1 plus Insight), so track text drops the inconsistent 'up to'.

Provisional recovery rulings: a player without supply or owned book Inklings ends their turn. If every player lacks both at turn start, end the Act and release the next reserve (or finish Act III), avoiding a reproduced suspended-Inkling deadlock. If tied participants both lack page-space Inklings, use the existing clockwise-from-active fallback. Neutral Inkling remains in its setup space through cleanup, consistent with book pieces staying between Acts. These rulings need designer playtesting.


## One memory per book (2026-10-07)

Designer correction: each player may have at most one of their own memories per book. Different players may each leave one there. A Lasting Impression now requires placing an Inkling on a page containing one owned memory; placement on the memory itself is optional. All ordinary and bonus upgrades enforce the same per-player book limit.
