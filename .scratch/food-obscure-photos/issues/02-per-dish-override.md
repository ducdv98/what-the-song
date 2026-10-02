# 02: Per-Dish Obscuring override

**What to build:** A Dish can carry its own Obscuring levels, the way it can carry its own focal point, so a photo that plays badly (pale soup, naturally dark and muddy) can be tuned without replacing the photo. The Dish's ladder uses its override in place of the shared levels, and the renderer shows them. See `spec.md`.

**Blocked by:** 01

**Status:** done

- [x] A Dish with an override plays under its own levels; a Dish without one plays under the shared levels
- [x] The catalogue validator rejects an override with the wrong length, an out-of-range value, or an obscured last value, and does not silently correct it
- [x] Existing catalogue data and the fixture catalogue validate unchanged
- [x] Ladder and validator tests cover the override and each rejection
- [x] A Zoom component test shows a Dish override reaching the rendered Stage
- [x] Root typecheck, lint, test and build pass

## Comments

Mostly landed with ticket 01: the optional per-Dish levels, the validator rules and the ladder tests exist. Remaining: a Zoom component test showing an override reaches the rendered Stage, and a check that the fixture catalogue still validates.

Finished by Codex, verified by Claude: added the Zoom component test showing an override reaches every rendered Stage, and an explicit check that the fixture catalogue validates unchanged. No production code changed. Root typecheck, lint and test pass.
