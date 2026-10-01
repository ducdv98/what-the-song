/**
 * The Topic contract (docs/adr/0002-topic-packages.md). A Topic is one kind of
 * thing the player guesses; each Topic package exports one value satisfying
 * this interface, and the registry in @wts/topics collects them.
 *
 * Nothing here knows about audio, photos or any one Topic's Clue.
 */

/** The one thing a Round asks the player to guess. Every Topic's catalogue entry extends this. */
export interface Subject {
  id: string;
  /** Hand-curated extra accepted names. */
  aliases?: string[];
}

export interface Topic<S extends Subject = Subject, C = unknown> {
  /** Plain string checked against the registry, never a DB enum. */
  id: string;
  /** A Subject's Clues in Stage order; its length is the length of the ladder. */
  ladder(subject: S): readonly C[];
  /** Whether a free-text Guess names the Subject. Each Topic owns this rule. */
  matches(subject: S, guess: string): boolean;
  /** Validates untrusted catalogue data, returning the Subjects or throwing. */
  validateCatalogue(data: unknown): S[];
  /** Names of the optional Facets this Topic declares (e.g. genre for Songs). */
  facets: readonly string[];
}
