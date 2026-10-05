Status: resolved

# Core: Reveal more and Give up

Parent spec: `../spec.md`

## What to build

In `packages/core/src/round.ts`, rename `skip` to `revealMore` (an attempt `kind` of `'reveal'`) and keep its behaviour, except that it does nothing on the last Stage instead of losing. Keep `giveUp` as the only way to lose without a wrong guess, allowed on any Stage. Update all callers (Game, FoodGame, PeopleGame), tests and the Round doc comment.

## Acceptance criteria

- [ ] `revealMore` opens the next Stage and costs Score as `skip` did; on the last Stage the Round is returned unchanged
- [ ] `giveUp` works on every Stage and records a lost Round with score 0
- [ ] No remaining `skip` export or `kind: 'skip'` in packages or apps
- [ ] Core tests cover both functions on first, middle and last Stage

## Blocked by

None.
