'use client';

import { MAX_LIVES } from '@/lib/game/round';

/** Lives as dots. Spent lives use the documented negative red. */
export function Lives({ livesLeft }: { livesLeft: number }) {
  return (
    <div
      style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center' }}
      role="status"
      aria-label={`${livesLeft} of ${MAX_LIVES} lives remaining`}
    >
      {Array.from({ length: MAX_LIVES }, (_, i) => {
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
