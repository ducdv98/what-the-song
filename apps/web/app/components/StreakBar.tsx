'use client';

import { winRate, type Stats } from '@wts/core';
import { useAuth } from './AuthProvider';
import { useI18n } from './I18nProvider';

/**
 * Current streak, best streak and totals.
 *
 * The current streak gets the accent only while it is actually running —
 * DESIGN.md §7: the accent is functional, so it should mark a live state rather
 * than decorate a zero.
 *
 * The line underneath says where these numbers live, because for a guest the
 * answer is "nowhere, once you close the tab" and that should not be a surprise.
 */
export function StreakBar({ stats, syncFailed }: { stats: Stats; syncFailed?: boolean }) {
  const { t } = useI18n();
  const { status, user } = useAuth();
  const items: { label: string; value: string; accent?: boolean }[] = [
    { label: t('stats.streak'), value: String(stats.currentStreak), accent: stats.currentStreak > 0 },
    { label: t('stats.best'), value: String(stats.bestStreak) },
    { label: t('stats.played'), value: String(stats.played) },
    { label: t('stats.winRate'), value: stats.played ? `${winRate(stats)}%` : '—' },
  ];

  let note: { text: string; tone: string } | null = null;
  if (syncFailed) note = { text: t('stats.syncFailed'), tone: 'var(--text-negative)' };
  else if (user) note = { text: t('stats.savedNote', { name: user.username }), tone: 'var(--text-muted)' };
  else if (status === 'guest') note = { text: t('stats.guestNote'), tone: 'var(--text-muted)' };

  return (
    <div className="card" style={{ display: 'grid', gap: 'var(--s-3)', padding: 'var(--s-4)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 'var(--s-3)',
        }}
      >
        {items.map((it) => (
          <div key={it.label} style={{ textAlign: 'center', minWidth: 0 }}>
            <div
              style={{
                font: 'var(--t-section-title)',
                color: it.accent ? 'var(--color-success)' : 'var(--text-base)',
                lineHeight: 1.1,
              }}
            >
              {it.value}
            </div>
            <div
              style={{
                font: 'var(--t-small)',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {it.label}
            </div>
          </div>
        ))}
      </div>
      {note && (
        <p
          role={syncFailed ? 'alert' : undefined}
          style={{ font: 'var(--t-small)', color: note.tone, margin: 0, textAlign: 'center' }}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
