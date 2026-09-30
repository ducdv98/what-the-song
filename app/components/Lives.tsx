'use client';

import { useI18n } from './I18nProvider';

/** Lives as dots. Spent lives use the documented negative red. */
export function Lives({
  livesLeft,
  maxLives,
}: {
  livesLeft: number;
  /** From the round, not a constant — difficulty changes how many you get. */
  maxLives: number;
}) {
  const { t } = useI18n();
  return (
    <div
      style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center' }}
      role="status"
      aria-label={t('round.livesLabel', { n: livesLeft, total: maxLives })}
    >
      {Array.from({ length: maxLives }, (_, i) => {
        const alive = i < livesLeft;
        return (
          <span
            key={i}
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: alive ? 'var(--text-base)' : 'transparent',
              border: alive ? 'none' : '1px solid var(--text-negative)',
              transition: 'background 160ms ease',
            }}
          />
        );
      })}
    </div>
  );
}
