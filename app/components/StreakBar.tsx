'use client';

import { winRate, type Stats } from '@/lib/game/stats';

/**
 * Current streak, best streak and totals.
 *
 * The current streak gets the accent only while it is actually running —
 * DESIGN.md §7: the accent is functional, so it should mark a live state rather
 * than decorate a zero.
 */
export function StreakBar({ stats }: { stats: Stats }) {
  const items: { label: string; value: string; accent?: boolean }[] = [
    { label: 'Chuỗi', value: String(stats.currentStreak), accent: stats.currentStreak > 0 },
    { label: 'Tốt nhất', value: String(stats.bestStreak) },
    { label: 'Đã chơi', value: String(stats.played) },
    { label: 'Thắng', value: stats.played ? `${winRate(stats)}%` : '—' },
  ];

  return (
    <div
      className="card"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 'var(--s-3)',
        padding: 'var(--s-4)',
      }}
    >
      {items.map((it) => (
        <div key={it.label} style={{ textAlign: 'center', minWidth: 0 }}>
          <div
            style={{
              font: 'var(--t-section-title)',
              color: it.accent ? 'var(--accent)' : 'var(--text-base)',
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
  );
}
