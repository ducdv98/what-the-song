'use client';

import type { PlaybackState } from '@/lib/audio/engine';
import { useI18n } from './I18nProvider';

/**
 * Circular play control — DESIGN.md §4 "Circular Play", using the accent
 * colour because playing is the primary action of the whole app.
 */
export function PlayButton({
  state,
  seconds,
  onPlay,
  disabled,
}: {
  state: PlaybackState;
  seconds: number;
  onPlay: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const busy = state === 'loading';
  const playing = state === 'playing';

  return (
    <div style={{ display: 'grid', placeItems: 'center', gap: 'var(--s-3)' }}>
      <button
        onClick={onPlay}
        disabled={disabled || busy}
        aria-label={t('round.playLabel', { seconds: formatSeconds(seconds) })}
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#000',
          display: 'grid',
          placeItems: 'center',
          boxShadow: 'var(--shadow-heavy)',
          transition: 'transform 120ms ease, filter 120ms ease',
          transform: playing ? 'scale(1.04)' : 'scale(1)',
          filter: playing ? 'brightness(1.1)' : 'none',
        }}
      >
        {busy ? (
          <Spinner />
        ) : (
          /* Simple geometric glyphs — no third-party icon dependency. */
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
            {playing ? (
              <>
                <rect x="6" y="5" width="4" height="14" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" fill="currentColor" />
              </>
            ) : (
              <path d="M8 5v14l11-7z" fill="currentColor" />
            )}
          </svg>
        )}
      </button>

      <span style={{ font: 'var(--t-small-bold)', color: 'var(--text-muted)' }}>
        {formatSeconds(seconds)}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="14 42"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

/** "0.1s" but "16s" — avoid showing "16.0s". */
export function formatSeconds(s: number): string {
  return `${Number.isInteger(s) ? s : s.toFixed(1)}s`;
}
