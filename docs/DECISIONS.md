# Current rulings and open playtest questions

Authority: latest explicit designer decisions → v15 catalog/rules → provisional
digital rulings here. Earlier Acts/bookmarks/plotlines/sidekick variants are retired.
This file is for decisions, not a transcript. Date: 2026-09-30.

## Confirmed source behavior

1. Two pages per book, with 3–5 slots split as evenly as possible. Figures occupy
   pages, not slots. Overflow belongs to the whole book; the submarine has none.
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
- The Odyssey remembers rows that were ever upgraded, even when An Unlikely
  Champion returns their last memory. Current row strength still drops normally.

## Scope boundaries

The game is automated for the imported set; tests and first browser journeys are
not a designer sign-off. No network multiplayer, matchmaking, public
hosting or published balance claims. Basic bots are now playable opponents; their heuristics and simulations are not strategic balance evidence.

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
publication Inkling. Choosing submarine overflow erases that Inkling normally.
Shoot-the-moon awards no publication because it is not a conflict. Publish after
token rewards, before other full books or an Act transition. Travel Subplots count
at most one new-book travel event per normal movement, even with several steps.

## Space-check revision 0.3 (designer confirmed)

- Normal protagonist movement is mandatory and must finish on a different page.
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

Every player, human or bot, begins with one distinct face-up Subplot drawn from
the shuffled core deck, at zero progress, before choosing starting pages. The
player board shows its objective and reward expanded by default.
