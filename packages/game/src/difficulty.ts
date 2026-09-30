/**
 * Difficulty is a property of the song: how well known it is.
 *
 * Every song carries a tier in the seed file (tools/ingest.py passes it into
 * the catalogue), and picking a difficulty picks the pool of songs — the same
 * model SongSpot uses, where "Easy" means hits everyone knows and "Impossible"
 * means deep cuts. The rules of a round are identical at every tier.
 *
 * A song without a tier counts as medium, so an untagged library still plays
 * and nothing becomes unreachable while the tagging catches up.
 */

export const TIER_SLUGS = ['easy', 'medium', 'hard', 'expert', 'impossible'] as const;
export type TierSlug = (typeof TIER_SLUGS)[number];

export interface Tier {
  slug: TierSlug;
  /** Vietnamese label. */
  label: string;
  /** English label. */
  gloss: string;
}

export const TIERS: readonly Tier[] = [
  { slug: 'easy', label: 'Dễ', gloss: 'Easy' },
  { slug: 'medium', label: 'Vừa', gloss: 'Medium' },
  { slug: 'hard', label: 'Khó', gloss: 'Hard' },
  { slug: 'expert', label: 'Chuyên gia', gloss: 'Expert' },
  { slug: 'impossible', label: 'Bất khả', gloss: 'Impossible' },
];

/** What an untagged song counts as. */
export const DEFAULT_TIER: TierSlug = 'medium';

export function isTier(value: unknown): value is TierSlug {
  return typeof value === 'string' && (TIER_SLUGS as readonly string[]).includes(value);
}

export function tierOf(song: { tier?: string | null }): TierSlug {
  return isTier(song.tier) ? song.tier : DEFAULT_TIER;
}

/** Songs in one tier; null means every tier. */
export function filterByTier<T extends { tier?: string | null }>(songs: T[], tier: TierSlug | null): T[] {
  return tier === null ? songs : songs.filter((s) => tierOf(s) === tier);
}

/** How many songs each tier has, in tier order — all five, including empty ones. */
export function tierCounts(songs: { tier?: string | null }[]): { tier: Tier; count: number }[] {
  const counts = new Map<TierSlug, number>();
  for (const s of songs) counts.set(tierOf(s), (counts.get(tierOf(s)) ?? 0) + 1);
  return TIERS.map((tier) => ({ tier, count: counts.get(tier.slug) ?? 0 }));
}
