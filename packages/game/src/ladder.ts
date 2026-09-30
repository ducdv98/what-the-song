/**
 * The clip lengths a round plays, in seconds: SongSpot's five stages, ending
 * on 16s. tools/ingest.py cuts exactly these by default (CLIP_LADDER there; a
 * test reads this file and fails if the two disagree).
 */
export const STAGE_TARGETS = [0.1, 0.5, 2, 8, 16] as const;

/**
 * Fallback ladder, used only when a song's manifest yields nothing.
 *
 * Not the source of truth for any real song: each song's rungs come from the
 * keys of its clip manifest (ladderFor in catalogue.ts), and stagesFor in
 * round.ts picks the five it plays. So a library built before the five-stage
 * default — seven clips, 0.1 · 0.5 · 1 · 2 · 4 · 8 · 16 — still plays exactly
 * these stages; its 1s and 4s clips are simply never requested.
 */
export const DEFAULT_LADDER = STAGE_TARGETS;
