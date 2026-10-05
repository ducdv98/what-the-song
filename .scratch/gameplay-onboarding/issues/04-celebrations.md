Status: ready-for-agent

# Celebrations and loss effects

Parent spec: `../spec.md`

## What to build

A win Celebration and a loss effect on the result screen of all three Topics, per `../spec.md` Decisions. Add `canvas-confetti`. Win pool of about seven effects (confetti, fireworks, Topic emoji rain, Meme/cheer bubble, vinyl/equalizer pulse for Songs, gold shine, cheer text by Stage), chosen at random without back-to-back repeats; always-on score count-up and Stage tiles flip; escalation for first-Stage win, hard-or-above Tier, Streak 3/5/10 and first Warm-up win. Loss: soft reveal, encouraging line by progress, Streak vs best Streak, prominent "Chơi tiếp", and the one-tap next Warm-up Round after a Warm-up loss. Haptics on win only. Honour `prefers-reduced-motion`. Selection and escalation logic is pure and unit-tested; effects are decoration and never affect Score.

## Acceptance criteria

- [ ] Every win shows a Celebration; the same big effect never plays twice in a row
- [ ] Escalation rules fire on the stated triggers
- [ ] Every loss shows the consoling effect with no shake, red flash, sound or vibration
- [ ] Reduced motion shows no animation
- [ ] Bundle growth is limited to `canvas-confetti`
- [ ] Meme popup behaviour is unchanged

## Blocked by

02, 03
