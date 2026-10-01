/**
 * Shared default numeric ladder and selection targets. The ingest tool
 * mirrors these values; a test checks that they stay aligned.
 */
export const STAGE_TARGETS = [0.1, 0.5, 2, 8, 16] as const;

/** Fallback when a Topic supplies no usable rungs. */
export const DEFAULT_LADDER = STAGE_TARGETS;
