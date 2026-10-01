'use client';

import { useState } from 'react';
import { coverUrl, TIERS, tierOf, type Round, type Song } from '@wts/game';
import type { PlaybackState } from '@/lib/audio/engine';
import { formatSeconds } from './PlayButton';
import { useI18n } from './I18nProvider';

/** Spoiler-free history: wrong, skipped, correct, and not reached. */
export function shareSquares(round: Round<Song>): string {
  return round.stages
    .map((_, i) => {
      const a = round.attempts[i];
      if (!a) return '⬜';
      if (a.kind === 'skip') return '⬛';
      return a.quality === 'none' ? '🟥' : '🟩';
    })
    .join('');
}

export function ResultCard({
  round,
  playback,
  onListen,
  onNext,
}: {
  round: Round<Song>;
  playback: PlaybackState;
  onListen: () => void;
  onNext: () => void;
}) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const won = round.status === 'won';
  const song = round.song;
  const cover = coverUrl(song);
  const at = formatSeconds(round.stages[round.stageIndex]);
  const longest = round.stages[round.stages.length - 1];
  const tier = TIERS.find((x) => x.slug === tierOf(song))!;

  async function share() {
    const text = t('result.shareText', {
      tier: lang === 'vi' ? tier.label : tier.gloss,
      squares: shareSquares(round),
      outcome: won ? t('result.shareWon', { at }) : t('result.shareLost'),
      score: round.score,
    });
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Share dismissed or clipboard blocked. */
    }
  }

  return (
    <section
      className="play-card result-card"
      data-testid="result"
      data-status={round.status}
      aria-labelledby="result-title"
    >
      <div className="card-masthead">
        <strong>WTS / {t('result.heading')}</strong>
        <span className="card-ticket">
          {lang === 'vi' ? tier.label : tier.gloss}
        </span>
      </div>
      <span
        className={`stamp ${won ? 'stamp--won' : 'stamp--lost'}`}
        role="status"
      >
        <span aria-hidden="true">{won ? '✓' : '×'}</span>
        {won ? t('result.guessedIn') : t('result.lost')}
      </span>
      <div className="result-cover">
        {cover && cover !== failedCover ? (
          // Static export: native image, with a fallback for missing cover files.
          <img
            src={cover}
            alt=""
            width={160}
            height={160}
            onError={() => setFailedCover(cover)}
          />
        ) : (
          <span
            className="cover-initials"
            data-testid="cover-fallback"
            aria-hidden="true"
          >
            {initials(song.title)}
          </span>
        )}
      </div>
      <div>
        {!won && (
          <p className="field-label" style={{ marginBottom: 8 }}>
            {t('result.itWas')}
          </p>
        )}
        <h2 id="result-title" className="result-title">
          {song.title}
        </h2>
        <p className="result-artist">{song.artist}</p>
      </div>
      <div className="result-summary">
        {won && <p className="result-clip">{t('result.wonAt', { at })}</p>}
        <p className="result-score">
          {t('round.points', { n: won ? round.score : 0 })}
        </p>
      </div>
      <div
        className="result-history"
        role="list"
        aria-label={t('result.history')}
      >
        {round.stages.map((seconds, i) => {
          const attempt = round.attempts[i];
          const kind = !attempt
            ? 'unreached'
            : attempt.kind === 'skip'
              ? 'skip'
              : attempt.quality === 'none'
                ? 'wrong'
                : 'correct';
          const outcome = t(
            kind === 'skip'
              ? 'result.skipped'
              : kind === 'wrong'
                ? 'result.wrong'
                : kind === 'correct'
                  ? 'result.correct'
                  : 'result.unreached',
          );
          return (
            <span
              key={seconds}
              className="history-stage"
              data-kind={kind}
              role="listitem"
              aria-label={t('result.stage', {
                n: i + 1,
                seconds: formatSeconds(seconds),
                outcome,
              })}
              title={`${formatSeconds(seconds)} · ${outcome}`}
            >
              <span aria-hidden="true">
                {kind === 'skip'
                  ? '–'
                  : kind === 'wrong'
                    ? '×'
                    : kind === 'correct'
                      ? '✓'
                      : '·'}
              </span>
            </span>
          );
        })}
      </div>
      <div className="result-actions">
        <button
          className="pill"
          onClick={onListen}
          disabled={playback === 'loading'}
        >
          <span aria-hidden="true">{playback === 'playing' ? '■' : '▶'}</span>{' '}
          {playback === 'playing'
            ? t('round.stopLabel')
            : t('result.listen', { seconds: formatSeconds(longest) })}
        </button>
        <button className="pill" onClick={() => void share()}>
          {copied ? t('result.copied') : t('result.share')}
        </button>
        <button className="pill next-button" onClick={onNext} autoFocus>
          {won ? t('result.next') : t('result.tryAgain')}{' '}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}

function initials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
