'use client';

import { REVEAL_LADDER } from '@/lib/audio/engine';
import { formatSeconds } from './PlayButton';

/**
 * The reveal ladder as a row of segments. Unlocked rungs take the accent;
 * locked ones stay achromatic, per DESIGN.md §7 (accent is functional only).
 */
export function RevealLadder({ stepIndex }: { stepIndex: number }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 4 }}>
        {REVEAL_LADDER.map((seconds, i) => {
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
        Unlocked: {formatSeconds(REVEAL_LADDER[stepIndex])} of{' '}
        {formatSeconds(REVEAL_LADDER[REVEAL_LADDER.length - 1])}
      </p>
    </div>
  );
}
