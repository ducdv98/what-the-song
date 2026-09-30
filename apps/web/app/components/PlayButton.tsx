'use client';

import type { PlaybackState } from '@/lib/audio/engine';
import { useI18n } from './I18nProvider';

/** Explicit audio playback with an ink press effect and actual clip length. */
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
    <div className="play-row">
      <button
        className="play-control"
        style={{ ['--play-size' as string]: `${size}px` }}
        onClick={playing ? onStop : onPlay}
        disabled={busy}
        aria-busy={busy}
        aria-label={
          playing
            ? t('round.stopLabel')
            : t('round.playLabel', { seconds: formatSeconds(seconds) })
        }
      >
        {busy ? (
          <svg
            className="spinner"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="14 42"
            />
          </svg>
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
            {playing ? (
              <rect
                x="6"
                y="6"
                width="12"
                height="12"
                rx="1"
                fill="currentColor"
              />
            ) : (
              <path d="M8 5v14l11-7z" fill="currentColor" />
            )}
          </svg>
        )}
      </button>
      <span className="clip-duration">
        <span data-testid="clip-length">{formatSeconds(seconds)}</span>
        <small>
          {busy
            ? t('loading')
            : playing
              ? t('round.playing')
              : t('round.clipLength')}
        </small>
      </span>
    </div>
  );
}

export function formatSeconds(s: number): string {
  return `${Number.isInteger(s) ? s : s.toFixed(1)}s`;
}
