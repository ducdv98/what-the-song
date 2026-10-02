# Food: harder photos with Obscuring

Status: ready-for-agent
Vocabulary: `CONTEXT.md` (Dish, Zoom, Stage, Clue, Tier). Builds on `.scratch/food/spec.md` and `docs/adr/0002-topic-packages.md`.

## Problem Statement

The Food Topic is too easy to guess. Even at the first Stage, a 25% centre crop of a Dish's photo still shows enough colour, texture and context (the broth, the herbs, the bowl) that players name the Dish at once. Winning on Stage 1 is routine, so Food Rounds feel trivial next to Songs and People, and the Stage ladder (and the Score that depends on it) loses its meaning.

## Solution

Keep the source photos exactly as they are and make the early Stages harder to read in the browser only. Besides the crop, each Stage now also **Obscures** the photo: early Stages show it blurry and in black and white, and each later Stage is sharper and more colourful, until the last Stage shows the whole photo in full colour and sharp, as before. The player is still shown one photo per Round and still gets a Credit afterwards; only how the photo looks while the Round is in progress changes.

## User Stories

1. As a player, I want the first Stage of a Food Round to be blurry and black and white, so that I cannot name the Dish from its colour or obvious shape alone.
2. As a player, I want each Stage to be a little sharper and more colourful than the last, so that skipping or guessing wrong feels like real progress towards the answer.
3. As a player, I want the last Stage to show the whole photo sharp and in full colour, so that a Round I am about to lose still gives me a fair last chance.
4. As a player, I want the crop to keep zooming out as it does today, so that I still learn where in the photo to look.
5. As a player, I want the change from one Stage to the next to animate smoothly, so that I can follow how the photo clears instead of seeing it jump.
6. As a player, I want the photo to become fully clear as soon as the Round is finished, so that after a win or a loss I can see the Dish properly and read its Credit.
7. As a player, I want a Dish to be harder at the same Tier than before, so that a well-known Dish still takes thought to recognise.
8. As a player, I want Tier to keep meaning how famous the Dish is, so that picking "easy" still gives me well-known Dishes and not just clearer photos.
9. As a player on a phone, I want the effect to look right at a narrow width, so that the blur is neither a flat smudge nor barely there on my screen.
10. As a player with an older or low-power phone, I want the photo to stay smooth while the Stages change, so that the game does not stutter.
11. As a player who prefers reduced motion, I want the Stage change to happen without a long animation, so that the game respects my system setting.
12. As a player, I want a Dish tuned with its own focal point to keep it together with the new effect, so that the part of the photo I am meant to see is still the part I see.
13. As a player, I want my Score, Streak and Leaderboard to work as they do now, so that this change does not affect my history.
14. As a player, I want Skip, Guess and the Meme on the result to behave as for other Topics, so that Food still feels like the same game.
15. As a screen reader user, I want the photo to stay a decorative image with no answer in its text, so that nothing gives the Dish away.
16. As the owner, I want the Obscuring levels in one place that I can tune, like the zoom fractions, so that I can make the game easier or harder without touching the renderer.
17. As the owner, I want the original photos kept untouched in storage, so that I can re-tune, change or remove the effect later without re-ingesting anything.
18. As the owner, I want no new ingest step, asset or API change, so that the catalogue, signing and publish flow stay as they are.
19. As the owner, I want a Dish to be able to override its own Obscuring (for instance a Dish whose photo is naturally dark and muddy), so that one badly suited photo does not need a different photo.
20. As a developer, I want the levels to be plain data in the Food package, so that tests can check the ladder without a browser.
21. As a developer, I want the renderer to turn a level into a visual effect in one place, so that adding or changing an effect (pixelation, say) touches one component.
22. As a developer, I want tests that fail if the last Stage is not fully clear, so that a tuning mistake cannot ship an impossible Round.

## Implementation Decisions

- **Obscuring** is a new concept: a per-Stage amount by which the Food Topic's Clue is degraded in the browser. It is added to `CONTEXT.md` next to Zoom, and the Zoom definition is amended: a Zoom is a crop *and* an Obscuring level; the full photo is still sent to the browser and hiding detail is still not a security boundary. A note that blur and grayscale are applied on the client only goes in the same entry.
- The Food package's Zoom (one Stage's Clue) gains an obscuring level beside its crop fraction. The level is a small normalised value from fully clear to maximum, not CSS, so the package stays free of presentation concerns.
- The shared ladder gets one tunable array of levels, next to the zoom fractions and the same length. Starting point: strongly obscured at Stage 1, falling Stage by Stage, and exactly clear at the last Stage. The exact numbers are placeholders to tune by playing, like the fractions were.
- A Dish may override the levels, the same way it can have its own focal point. The override is optional and validated by the Food catalogue validator: right length, each value within range, and the last value must be clear. Existing catalogue data stays valid without changes.
- The last Stage is always fully clear. A catalogue or override that breaks this is rejected, not silently corrected.
- The Zoom renderer maps a level to two effects together: blur and black and white. Both fall to nothing as the level falls to clear. Saturation is reduced toward grayscale rather than switched off, so the change to colour is gradual.
- Blur strength is chosen so that it looks the same whatever the crop. The crop works by scaling the photo up, which also scales any blur applied to it, so the renderer compensates for the Stage's zoom and for the displayed width. The target is a consistent on-screen effect, checked at phone and desktop widths.
- The image element stays mounted across Stages, as it does now, so effects animate with the same transition as the crop. The transition is skipped or shortened for users who prefer reduced motion.
- The effect is applied only while the Round is in progress. When the Round is won or lost, the photo is shown clear.
- Effects are on the client only, using what the browser already provides for images. No new image is generated, stored, signed or fetched, so the ingest tool, the asset signing flow, the COS layout, the API and the contracts do not change.
- Tier, Score, Streak, Leaderboard, Meme, matching and the region Facet do not change.
- No setting is added to switch Obscuring off. Difficulty is a property of the Topic, not a preference.

## Testing Decisions

- A good test checks what a player or the catalogue owner can observe: the levels a Dish plays under, and what the rendered Stage looks like. It does not assert on internal helper functions or exact CSS strings beyond what defines the behaviour (that an effect is present, absent, or stronger than the previous Stage).
- **Seam 1, the Food Topic's ladder** (`ladderFor` and the catalogue validator in the Food package): each Dish yields five Stages whose levels never get stronger, start obscured and end exactly clear; a per-Dish override replaces the shared levels; an override with the wrong length, an out-of-range value, or an obscured last Stage is rejected; fixture data without overrides still validates.
- **Seam 2, the Zoom component** (the existing renderer test that renders a Stage to markup): Stage 1 renders blur and reduced colour, each following Stage renders less than the one before, the last Stage renders neither, and the one-image-stays-mounted check still passes; the focal point test still passes unchanged. A finished Round's result shows the photo without effects.
- Prior art: the Zoom crop and focal-point tests in the existing Food component test, and the ladder and catalogue tests in the Food package. New tests follow their style and extend those files rather than adding a third seam.
- Visual tuning (is Stage 1 hard enough, is Stage 4 fair) is judged by playing in the browser; it is not automated.

## Out of Scope

- Changing the stored photos, the ingest tool, signing, the COS layout or the API.
- Server-side or pre-generated blurred or grayscale images (no extra assets to protect against cheating; the full photo is already in the browser).
- Making the effect secure against a determined player opening the network tab or the page source.
- A per-player difficulty setting or a toggle for Obscuring.
- Other effects such as pixelation, mosaic, noise, rotation or flipping; the design should make them easy to add later but this spec ships blur and black and white only.
- Obscuring for the Songs or People Topics.
- Changing Tier assignments, the zoom fractions, the number of Stages or Score.
- Replacing photos that are poor fits for the effect.

## Further Notes

- The two aims pull against each other: harder early Stages, but a fair last Stage. Because the last Stage is clear and the crop is the whole photo, a Round can always be won at the end for the lowest Score, which is the intended floor.
- A blurred, grayscale 25% crop can be close to unreadable for some Dishes (pale soups, white rice dishes). Per-Dish overrides exist for this; start with the shared levels and tune only the Dishes that play badly.
- Blur and grayscale are cheap for the browser, but strong blur on a scaled-up large photo can be slow on weak phones. Check on a real low-end device before settling on the numbers.
