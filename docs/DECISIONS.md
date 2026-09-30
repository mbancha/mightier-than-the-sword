# Current rulings and open playtest questions

Authority: latest explicit designer decisions → v15 catalog/rules → provisional
digital rulings here. Earlier Acts/bookmarks/plotlines/sidekick variants are retired.
This file is for decisions, not a transcript. Date: 2026-09-29.

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
6. An Unlikely Champion costs returning your memory from your protagonist's book.
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
not a designer sign-off. No network multiplayer, opponent AI, matchmaking, public
hosting or published balance claims. Bots/simulations used in tests select legal
actions for exercising code; they are not strategic balance evidence.
