/**
 * Tier is a property of a Subject: how well known it is.
 *
 * Picking a tier selects a pool of Subjects and scales Stage-based Score by
 * that Tier's multiplier. A Subject without a tier counts as medium.
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

/** What an untagged Subject counts as. */
export const DEFAULT_TIER: TierSlug = 'medium';

/** Score multiplier for each Tier, shared by Round scoring and API validation. */
export const TIER_MULTIPLIERS: Readonly<Record<TierSlug, number>> = {
  easy: 0.4,
  medium: 0.6,
  hard: 0.8,
  expert: 0.9,
  impossible: 1.0,
};

export function isTier(value: unknown): value is TierSlug {
  return typeof value === 'string' && (TIER_SLUGS as readonly string[]).includes(value);
}

export function tierOf(subject: { tier?: string | null }): TierSlug {
  return isTier(subject.tier) ? subject.tier : DEFAULT_TIER;
}

/** Subjects in one tier; null means every tier. */
export function filterByTier<T extends { tier?: string | null }>(subjects: T[], tier: TierSlug | null): T[] {
  return tier === null ? subjects : subjects.filter((s) => tierOf(s) === tier);
}

/** How many Subjects each tier has, in tier order — all five, including empty ones. */
export function tierCounts(subjects: { tier?: string | null }[]): { tier: Tier; count: number }[] {
  const counts = new Map<TierSlug, number>();
  for (const s of subjects) counts.set(tierOf(s), (counts.get(tierOf(s)) ?? 0) + 1);
  return TIERS.map((tier) => ({ tier, count: counts.get(tier.slug) ?? 0 }));
}
