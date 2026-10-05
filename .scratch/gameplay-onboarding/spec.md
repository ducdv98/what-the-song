Status: ready-for-agent

# Gameplay onboarding: Give up vs Reveal more, Warm-up, Celebrations

## Problem Statement

1. The "Bỏ qua" button opens the next Stage and costs Score, but players read it as giving up. Giving up exists ("Chịu thua") only on the last Stage, so a player who wants to leave a Round cannot.
2. The first Round is too hard. A new player gets a 0.1s clip (or the smallest photo crop), guesses wrong three or four times and quits before ever winning.
3. A win is not rewarded beyond a score, and a loss is a bare result. Nothing makes the player want one more Round.

## Solution

1. Two explicit buttons on every Stage: **Give up** (labelled "Bỏ qua") ends the Round as lost and shows the answer; **Reveal more** (labelled "Gợi ý thêm") opens the next Stage (the old Skip). Enter on an empty box does nothing.
2. A **Warm-up** for a player with no history in a Topic: easy-Tier Subjects only, opening at the middle Stage of the ladder, until the first win or three Rounds.
3. A **Celebration** on every win, varied so it does not get boring, scaling with merit (early Stage, higher Tier, Streak milestones, first Warm-up win). A gentle, consoling **loss effect** on every loss, with a one-tap next Warm-up Round after a Warm-up loss.

Terms (Reveal more, Give up, Warm-up, Celebration) are defined in `CONTEXT.md`.

## Decisions

- Reveal more is hidden/disabled on the last Stage. Give up is available on every Stage, needs no confirmation, scores 0 and ends the Streak.
- Warm-up: per Topic; easy Tier only (fallback easy + medium when a Topic has fewer than ~10 easy Subjects); opens at Stage `floor(ladder length / 2)`; Reveal more only moves forward; ends after first win or 3 Rounds; skipped when a Tier is saved or the player has recorded Rounds in that Topic. Score is by real Stage position (no inflation); Warm-up wins count towards Streak and Leaderboard.
- History source: server stats when signed in, guest stats for guests, plus a per-Topic `localStorage` marker so a guest's Warm-up does not repeat on reload.
- Celebrations: `canvas-confetti` (~3 KB) plus CSS-only effects. Always-on small effects (score count-up, Stage tiles flip); one random big effect from a pool, never the same twice in a row; a second effect on a first-Stage win, hard-or-above Tier, Streak of 3/5/10, and the biggest on the first Warm-up win. `prefers-reduced-motion`: static score and cheer text only. Haptics (`navigator.vibrate`) on a win only. No sound in this effort.
- Loss: soft answer reveal, an encouraging line chosen by how far the player got, Streak loss shown beside the best Streak, a prominent "Chơi tiếp" button. No shake, red flash, sound or vibration. After a Warm-up loss, "Thử một bài dễ hơn nhé?" starts a different Warm-up Subject in one tap.
- No ADR: nothing here is hard to reverse.

## Out of scope

Sound, lottie/mascot assets, changes to Score formula, Leaderboard rules.
