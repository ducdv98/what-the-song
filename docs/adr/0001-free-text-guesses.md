# Guesses are free text, not picked from suggestions

Players type their answer from memory; the game no longer offers an autocomplete list. This reverses the choice in `docs/RESEARCH.md` §3.2, which constrained input to a typeahead so that judging was an id comparison.

We did it because a visible list makes the game too easy: the player can scan titles instead of recalling the song. The cost is that the matcher now judges every round, so its rules are deliberately narrow:

- A Guess wins when it equals the round's title or an alias after both sides are reduced to accent-free words (tones, vowel marks and `đ` folded; punctuation and `feat.`/bracket noise removed).
- Typo tolerance and the `telex` fallback (IME-off tone keys) are **not** accepted. `telex` is lossy and mangles real words, and a false win is a worse failure than a missed one.
- Judging is against the round's own song only, so two songs sharing a title are not told apart.
- Judging stays in the browser with the shared `@wts/core` code; the search index is removed from the client. Keeping the answer off the client was rejected as not worth losing the static export, for a private friends-only game.
- Wrong guesses are echoed back with no "close" signal, so near-misses leak nothing.
- Scoring and the leaderboard are unchanged.

If strictness frustrates players, typo tolerance on long titles is the first thing to revisit.
