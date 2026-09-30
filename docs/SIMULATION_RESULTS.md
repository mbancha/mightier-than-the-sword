# Simulation snapshot — 2026-09-30

Bot policy `strategic-1`; rules `mightier-0.3.0`; catalog fingerprint `f2871eed`.

## 1,000 all-strategic games

Seeds 1–1000; mixed 2/3/4-player counts; 5,000-decision cap. All games completed, zero failures. Rates split tied wins.

| Players | Games | Turns/player | Upgrades/player | Subplots/player | Conflicts/game |
| --- | --- | --- | --- | --- | --- |
| 2 | 334 | 14.27 | 2.84 | 1.38 | 4.09 |
| 3 | 333 | 14.82 | 2.69 | 1.65 | 6.50 |
| 4 | 333 | 15.11 | 2.41 | 1.62 | 9.20 |

## 300 comparison games

Seeds 10001–10300; one strategic bot against original basic bots, rotating seats. All completed. Each player count has 100 games.

| Players | Strategic bot game win share | Equal-share baseline |
| --- | --- | --- |
| 2 | 57.5% | 50.0% |
| 3 | 40.0% | 33.3% |
| 4 | 36.5% | 25.0% |

## Signals to investigate

Earlier seats outperform later seats in the all-strategic sample. In four-player games, seat 1 has a 33.9% game win share, versus 17.3% for seat 4. This could reflect rules, turn-order tie breaking, or bot behavior; it is not a causal diagnosis.

Character acquisition and completed Subplots correlate with earlier success. Do not label cards overpowered from ownership rates alone. This snapshot is a regression baseline, not a balance certification.

Full HTML/JSON/CSV reports are generated under `artifacts/simulations/latest` and `artifacts/simulations/comparison` (ignored by Git). Reproduce with the README commands and this code revision.
