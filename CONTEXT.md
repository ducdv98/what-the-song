# What the Song

A guess-the-song game for Vietnamese music, played with friends. A short clip plays and the player names the track, trading score for a longer clip when they need one.

## Language

**Song**:
A catalogue entry: one title, one artist, optional aliases, a tier and a genre.
_Avoid_: track, entry

**Round**:
One attempt at one Song, played through a ladder of Stages until it is won or lost.
_Avoid_: game, turn

**Stage**:
One rung of a Round's ladder: a clip of a fixed length (default 0.1s, 0.5s, 2s, 8s, 16s). The Stages are the attempts; there are no lives.
_Avoid_: step, level, clue

**Clip**:
The pre-cut audio for one Stage of one Song.

**Guess**:
Free text the player types as their answer. There is no suggestion list; the player must produce the answer from memory.
_Avoid_: pick, selection, suggestion

**Skip**:
Opening the next Stage without Guessing.

**Match**:
A Guess counts as the Song when it names the Song's title or one of its aliases, tolerant of diacritics and tone placement: both sides are reduced to accent-free words and compared, so "nơi này co anh" and "noi nay co anh" both Match "Nơi Này Có Anh". Typo tolerance and IME-off typing (Telex tail keys such as "cuar") do not Match. Matching is judged against the Round's own Song only, so two Songs sharing a title are not told apart.
_Avoid_: correct answer

**Alias**:
A hand-curated extra accepted title for a Song, such as a bilingual title or a nickname.

**Score**:
Points for a won Round, highest on the first Stage and lowest on the last. Feeds the Leaderboard.

**Streak**:
Consecutive won Rounds.

**Tier**:
How well known a Song is: easy, medium, hard, expert or impossible. Picks the difficulty a Song plays under.

**Leaderboard**:
Weekly and monthly rankings of players by Score.

## Relationships

- A **Round** is for exactly one **Song** and has one **Stage** per **Clip**.
- A **Guess** is judged against the **Song** of the **Round** it is made in, and nothing else.
- A won **Round** yields a **Score** that depends on the **Stage** it was won on.

## Flagged ambiguities

- "Guess" used to mean either a typed text or a picked suggestion. Suggestions are gone, so **Guess** is free text only.
