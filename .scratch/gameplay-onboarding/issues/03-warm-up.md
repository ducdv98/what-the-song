Status: resolved

# Warm-up Rounds for new players

Parent spec: `../spec.md`

## What to build

Implement Warm-up per `../spec.md` Decisions: eligibility (no history in the Topic, no saved Tier), easy-Tier Subject selection with the small-pool fallback, opening Stage `floor(ladder length / 2)` with Reveal more moving forward only, ending after the first win or 3 Rounds, history read from server stats (signed in) or guest stats plus a per-Topic `localStorage` marker (guest). Check the easy-Tier count per Topic first. Warm-up Rounds are recorded like any other (real Stage score, Streak, Leaderboard).

## Acceptance criteria

- [ ] A new player's first Round in each Topic is an easy Subject opening mid-ladder
- [ ] Warm-up ends after the first win or the third Round, then normal play resumes
- [ ] A player with a saved Tier or recorded Rounds never gets one
- [ ] A guest reload does not restart Warm-up
- [ ] Recorded Score stays within the existing API Tier bounds
- [ ] Pure selection/eligibility logic is unit-tested without the DOM

## Blocked by

01
