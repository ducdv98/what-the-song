/**
 * Fallback reveal ladder, used only when a song's manifest yields nothing.
 *
 * This is no longer the source of truth: each song carries its own ladder,
 * derived from the keys of its clip manifest (see ladderFor in catalogue.ts).
 * A per-song ladder is what lets a track with a long generic intro start at 2s
 * while a distinctive one still starts at 0.1s — and it removes the duplicated
 * constant that previously had to be kept in step with tools/ingest.py by hand.
 */
export const DEFAULT_LADDER = [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0] as const;
