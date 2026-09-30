'use client';

import type { PlaybackState } from '@/lib/audio/engine';
import { useI18n } from './I18nProvider';

/**
 * The big circular play control, glowing because playing is the primary
 * action of the whole app. Tapping it while a clip plays stops it. The clip
 * length sits beside it, large, so it is always clear what the next play is.
 */
export function PlayButton({
  state,
  seconds,
  onPlay,
  onStop,
  size = 112,
}: {
  state: PlaybackState;
  seconds: number;
  onPlay: () => void;
  onStop: () => void;
  size?: number;
}) {
  const { t } = useI18n();
  const busy = state === 'loading';
  const playing = state === 'playing';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--s-4)' }}>
      {/* Balances the label on the right, so the button itself is centred. */}
      <span aria-hidden="true" style={{ minWidth: 56 }} />
      <button
        onClick={playing ? onStop : onPlay}
        disabled={busy}
        aria-label={playing ? t('round.stopLabel') : t('round.playLabel', { seconds: formatSeconds(seconds) })}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#000',
          display: 'grid',
          placeItems: 'center',
          boxShadow: playing
            ? '0 0 0 10px rgba(30, 215, 96, 0.14), 0 0 48px rgba(30, 215, 96, 0.45)'
            : '0 0 36px rgba(30, 215, 96, 0.35)',
          transition: 'box-shadow 160ms ease, transform 120ms ease',
        }}
      >
        {busy ? (
          <Spinner />
        ) : (
          <svg width={size * 0.36} height={size * 0.36} viewBox="0 0 24 24" aria-hidden="true">
            {playing ? (
              <>
                <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
              </>
            ) : (
              <path d="M8 5v14l11-7z" fill="currentColor" />
            )}
          </svg>
        )}
      </button>
      <span
        data-testid="clip-length"
        style={{
          minWidth: 56,
          font: '600 22px/1 ui-monospace, SFMono-Regular, Menlo, monospace',
          color: 'var(--accent)',
        }}
      >
        {formatSeconds(seconds)}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
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
