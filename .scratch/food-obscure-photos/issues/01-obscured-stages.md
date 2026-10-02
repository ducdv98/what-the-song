# 01: Obscured Stages, end to end

**What to build:** A Food Round shows the Dish's photo blurry and nearly black and white at Stage 1, and each later Stage is sharper and more colourful. The last Stage, and the photo on a finished Round's result, are fully clear. The Food Topic gains a shared, tunable array of Obscuring levels beside the zoom fractions, and each Stage of a Dish's ladder carries a level. The Zoom renderer turns a level into blur plus reduced colour, animated by the same transition as the crop. "Obscuring" is added to `CONTEXT.md` and the Zoom entry is amended (a Zoom is a crop and an Obscuring level; client-side only; hiding detail is still not a security boundary). See `spec.md`.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Playing a Food Round in the browser shows Stage 1 blurry and nearly black and white, and each later Stage visibly clearer
- [x] The last Stage is exactly clear, and a won or lost Round's result shows the photo without effects
- [x] Levels are plain data in the Food package (not CSS), in one tunable array of the same length as the zoom fractions
- [x] Ladder tests: five Stages per Dish, levels never get stronger, Stage 1 is obscured, the last is exactly clear
- [x] Zoom component tests: Stage 1 renders blur and reduced colour, each later Stage renders less, the last renders neither; the one-mounted-image and focal-point tests still pass unchanged
- [x] `CONTEXT.md` defines Obscuring and amends Zoom
- [x] Ingest, asset signing, the API, contracts, Tier, Score and Meme are unchanged
- [x] Root typecheck, lint, test and build pass

## Comments

Implemented by Codex, verified by Claude: root typecheck, lint, test and build pass. Codex reviewed along both axes. Scope deviation accepted: the per-Dish override field, its validator and ladder tests (ticket 02's data half) landed here. Blur is a plain 2.5px x level with no compensation for the crop's scale; that is ticket 03.
