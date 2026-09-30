'use client';

import { formatSeconds } from './PlayButton';

/**
 * The reveal ladder as a row of segments. Unlocked rungs take the accent;
 * locked ones stay achromatic, per DESIGN.md §7 (accent is functional only).
 */
export function RevealLadder({
  stepIndex,
  ladder,
}: {
  stepIndex: number;
  ladder: readonly number[];
}) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 4 }}>
        {ladder.map((seconds: number, i: number) => {
          const unlocked = i <= stepIndex;
          return (
            <div
              key={seconds}
              title={formatSeconds(seconds)}
              style={{
                flex: seconds,
                minWidth: 6,
                height: 6,
                borderRadius: 'var(--r-full-pill)',
                background: unlocked ? 'var(--accent)' : 'var(--surface-card)',
                transition: 'background 200ms ease',
              }}
            />
          );
        })}
      </div>
      <p
        style={{
          font: 'var(--t-small)',
          color: 'var(--text-muted)',
          margin: 'var(--s-2) 0 0',
        }}
      >
        {/* Segment widths are proportional to clip length, so the ladder reads
            as a real timeline rather than equal steps. */}
        Unlocked: {formatSeconds(ladder[stepIndex])} of{' '}
        {formatSeconds(ladder[ladder.length - 1])}
      </p>
    </div>
  );
}
