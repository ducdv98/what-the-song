# Tier multiplier in the core scoring

Status: done
Blocked by: none

See `spec.md` (Scoring decisions).

Make a won Round's Score depend on the Subject's Tier.

Put the multiplier table (easy 0.4, medium 0.6, hard 0.8, expert 0.9, impossible 1.0) beside the Tier definitions in the core package. The scoring function takes the Tier and returns the Stage-based Score times the multiplier, rounded. `submitGuess` uses the Subject's Tier (untagged = medium). Expose a per-Tier floor and ceiling helper and keep a global ceiling of 1000. Update the web callers of the scoring function (points-if-win-now and skip-cost displays) to pass the Tier.

## Done when
- Every Tier on the first and last Stage scores as specified; impossible first Stage is 1000.
- Ladders of 1, 3, 5 and 7 Stages work; Score is non-increasing by Stage within a Tier and strictly increasing by Tier at the same Stage.
- An untagged Subject scores as medium; a loss is 0.
- The Game page shows scaled points before guessing and in the skip hint; the result card and share text show the scaled Score.
- Core tests (node:test, like `round.test.ts`) cover the above.
