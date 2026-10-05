Status: ready-for-agent

# UI: Give up and Reveal more buttons

Parent spec: `../spec.md`

## What to build

Replace the single morphing action button in `GuessBar` with a Guess button plus two explicit buttons: Reveal more ("Gợi ý thêm" / "Reveal more", shows its next-Stage cost as the old skip-cost text does) and Give up ("Bỏ qua" / "Give up", visually quiet). Both are shown on every Stage; Reveal more is hidden on the last. Enter submits a Guess when the box has text and does nothing when empty. Update i18n (vi/en), the FAQ answer, the how-to texts and DESIGN.md. Applies to Songs, Food and People pages.

## Acceptance criteria

- [ ] Give up ends the Round as lost on any Stage and shows the answer and the lost Meme
- [ ] Reveal more advances one Stage and never ends the Round
- [ ] Enter on an empty box triggers neither
- [ ] No "Skip" / "Bỏ qua" label means opening the next Stage anywhere in the UI or FAQ
- [ ] Component tests cover both buttons on all three Topics

## Blocked by

01
