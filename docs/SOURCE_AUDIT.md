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
- npm packages: retain upstream licenses. Repository remains private; no new
  open-source or commercial-use license is asserted.

## Digital revision 0.2

Latest designer instructions supersede the v15 setup: only three books initially,
hex-grid publication after conflicts, edge-by-edge movement, optional bot seats,
and tactile piece interactions. Component counts and card text are unchanged.
The shared rules catalog and generated current PDF include this revision; the
approved v15 snapshot remains an immutable historical reference.
