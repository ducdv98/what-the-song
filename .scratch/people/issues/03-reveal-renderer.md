# Reveal renderer

Status: done
Blocked by: 02

Add the Reveal renderer in `apps/web`, keyed by `people`: show the top *n*% of the Person's photo, from the hair down, growing Stage by Stage until the whole face shows at the last. The reveal is done in the browser; the full photo is sent.

## Done when
- Each of the five Stages shows the right fraction, including a per-Person override.
- No Credit is rendered for a Person.
- Tests cover the fractions at every Stage and across widths.

## Comments

Implemented by Codex, verified by Claude: web typecheck, lint and the full test suite pass. Adds `RevealPhoto` and `PeopleGame`; `people` is deliberately not registered as a renderer, so no `/people` route exists until issue 05. The Codex reviews' fixes were applied: a translated photo-load error and a stronger override test. Deferred, judgement calls: `PeopleGame` repeats most of `FoodGame` (a shared photo-Round flow would remove it), `ResultCard` tells Dishes from Persons by field shape rather than an explicit Topic discriminator, and Topic copy is chosen by nested ternaries (a Topic-to-key lookup would be cleaner). `FoodGame` has the same hard-coded English photo error, left unchanged.
