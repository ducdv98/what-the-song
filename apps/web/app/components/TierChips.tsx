'use client';

import type { Tier, TierSlug } from '@wts/core';
import { useI18n } from './I18nProvider';
import { radioKeys } from './radioKeys';

/**
 * Full difficulty labels with an ink selected state. Empty tiers are disabled, so the
 * scale is always complete and it is obvious what is still untagged.
 */
export function TierChips({
  tiers,
  value,
  onChange,
  topic = 'songs',
}: {
  topic?: 'songs' | 'food';
  tiers: { tier: Tier; count: number }[];
  value: TierSlug;
  onChange: (t: TierSlug) => void;
}) {
  const { lang, t } = useI18n();
  return (
    <div className="difficulty-picker">
      <p className="field-label">{t('picker.difficulty')}</p>
      <div
        role="radiogroup"
        onKeyDown={radioKeys}
        aria-label={t('picker.difficulty')}
        className="tier-options"
      >
        {tiers.map(({ tier, count }) => (
          <button
            key={tier.slug}
            role="radio"
            aria-checked={tier.slug === value}
            tabIndex={tier.slug === value ? 0 : -1}
            className="tier-chip"
            disabled={count === 0}
            title={`${lang === 'vi' ? tier.gloss : tier.label} · ${count}`}
            onClick={() => onChange(tier.slug)}
          >
            {lang === 'vi' ? tier.label : tier.gloss}
          </button>
        ))}
      </div>
      <p className="field-label">{topic === 'food' ? t('food.tierScoreHint') : t('picker.tierScoreHint')}</p>
    </div>
  );
}
