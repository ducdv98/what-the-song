# What the Song

A guess-the-song game for Vietnamese music, played with friends. A short clip plays and the player names the track, trading score for a longer clip when they need one.

## Language

**Topic**:
A kind of thing the player is asked to guess, such as Songs or People. Each Topic has its own catalogue and its own kind of clue. Accounts, Score, Streak and Leaderboard are shared across Topics, and every Round records its Topic.
_Avoid_: category, deck, mode

**Subject**:
The one thing a Round asks the player to guess; a catalogue entry of some Topic. A Song is a Subject of the Songs Topic.
_Avoid_: answer, item, entry

**Song**:
A Subject of the Songs Topic: one title, one artist, optional aliases, a tier and a genre.
_Avoid_: track

**Person**:
A Subject of the People Topic: one name, optional aliases and one face photo.
_Avoid_: celebrity, figure

**Round**:
One attempt at one Subject, played through a ladder of Stages until it is won or lost.
_Avoid_: game, turn

**Stage**:
One rung of a Round's ladder: the point at which a Clue is shown. The Stages are the attempts; there are no lives. A Subject's ladder can be any length; Score depends on a Stage's position within the ladder, not on the Topic.
_Avoid_: step, level

**Clue**:
What a Stage shows the player. Each Topic has its own kind of Clue.
_Avoid_: hint

**Clip**:
The Clue of the Songs Topic: pre-cut audio of fixed length for one Stage of one Song (default 0.1s, 0.5s, 2s, 8s, 16s).

**Reveal**:
The Clue of the People Topic: the top part of a Person's photo, from the hair down, shown at one Stage until the whole face is visible at the last. The same fractions apply to every Person unless a Person is tuned individually. The full photo is sent to the browser; hiding the rest is not a security boundary.

**Guess**:
Free text the player types as their answer. There is no suggestion list; the player must produce the answer from memory.
_Avoid_: pick, selection, suggestion

**Skip**:
Opening the next Stage without Guessing.

**Match**:
A Guess counts as the Subject when it names the Subject's title or name, or one of its aliases; each Topic decides what that means. For Songs, the rule is this: it names the Song's title or one of its aliases, tolerant of diacritics and tone placement: both sides are reduced to accent-free words and compared, so "nơi này co anh" and "noi nay co anh" both Match "Nơi Này Có Anh". Typo tolerance and IME-off typing (Telex tail keys such as "cuar") do not Match. Matching is judged against the Round's own Song only, so two Songs sharing a title are not told apart.
_Avoid_: correct answer

**Alias**:
A hand-curated extra accepted title or name for a Subject, such as a bilingual title, a nickname or a stage name.

**Score**:
Points for a won Round, highest on the first Stage and lowest on the last. Feeds the Leaderboard.

**Streak**:
Consecutive won Rounds.

**Tier**:
How well known a Subject is: easy, medium, hard, expert or impossible. The scale is the same for every Topic and picks the difficulty a Subject plays under. A Subject with no Tier counts as medium.

**Facet**:
An optional label a Topic puts on its Subjects so players can narrow what they play, such as a Song's genre or, later, a Person's field. A Topic declares which Facets it has; the shared game knows only that a Facet is an optional tag.
_Avoid_: genre (for the shared idea; genre is the Songs Topic's Facet)

**Leaderboard**:
Weekly and monthly rankings of players by Score.

## Relationships

- A **Topic** has many **Subjects**; a **Song** is a **Subject** of the Songs **Topic**.
- A **Round** is for exactly one **Subject** and has one **Stage** per **Clue**.
- A **Subject** has one **Tier** and at most one **Facet** value.
- A **Guess** is judged against the **Subject** of the **Round** it is made in, and nothing else.
- A won **Round** yields a **Score** that depends on the **Stage** it was won on.
- **Score**, **Streak** and the **Leaderboard** are global across **Topics**, and can also be viewed per **Topic**.

## Flagged ambiguities

- "Guess" used to mean either a typed text or a picked suggestion. Suggestions are gone, so **Guess** is free text only.
