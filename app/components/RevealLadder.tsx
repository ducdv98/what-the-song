'use client';

import { formatSeconds } from './PlayButton';
import { useI18n } from './I18nProvider';

/**
 * Progress through the reveal ladder.
 *
 * Segments are EQUAL width, not proportional to clip length. Proportional
 * widths were the first attempt and they read terribly: at a 0.1s-to-16s range
 * the early rungs collapse to invisible dots, so you cannot see how many clues
 * remain or which one you are on — which is the only thing this control is for.
 * Equal segments answer "where am I" at a glance; the seconds are stated in
 * words underneath, where they are actually readable.
 */
export function RevealLadder({
  stepIndex,
  ladder,
}: {
  stepIndex: number;
  ladder: readonly number[];
}) {
  const { t } = useI18n();
  const total = ladder.length;
  const remaining = total - stepIndex - 1;

  return (
    <div>
      <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
        {ladder.map((seconds, i) => (
          <div
            key={seconds}
            title={formatSeconds(seconds)}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 'var(--r-full-pill)',
              background:
                i < stepIndex
                  ? 'var(--accent-border)'
                  : i === stepIndex
                    ? 'var(--accent)'
                    : 'var(--surface-card)',
              transition: 'background 200ms ease',
            }}
          />
        ))}
      </div>

      <p
        style={{
          font: 'var(--t-small)',
          color: 'var(--text-muted)',
          margin: 'var(--s-2) 0 0',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{t('round.segment', { n: stepIndex + 1, total })}</span>
        <span>
          {remaining > 0
            ? t('round.remaining', { n: remaining })
            : t('round.lastSegment')}
        </span>
      </p>
    </div>
  );
}
