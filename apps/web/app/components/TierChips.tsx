'use client';

import type { Tier, TierSlug } from '@wts/game';
import { useI18n } from './I18nProvider';

/**
 * The five difficulty tiers as colour-coded chips, easy (green) through
 * impossible (violet). A tier with no songs is shown but disabled, so the
 * scale is always complete and it is obvious what is still untagged.
 */
export function TierChips({
  tiers,
  value,
  onChange,
}: {
  tiers: { tier: Tier; count: number }[];
  value: TierSlug;
  onChange: (t: TierSlug) => void;
}) {
  const { lang, t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t('picker.difficulty')}
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}
    >
      {tiers.map(({ tier, count }) => (
        <button
          key={tier.slug}
          role="radio"
          aria-checked={tier.slug === value}
          className="tier-chip"
          disabled={count === 0}
          title={`${lang === 'vi' ? tier.gloss : tier.label} · ${count}`}
          onClick={() => onChange(tier.slug)}
          style={{ ['--c' as string]: `var(--tier-${tier.slug})` }}
        >
          {lang === 'vi' ? tier.label : tier.gloss}
        </button>
      ))}
    </div>
  );
}
