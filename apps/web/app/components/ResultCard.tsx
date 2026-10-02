'use client';

import { useEffect, useState } from 'react';
import { TIERS, tierOf, type Round } from '@wts/core';
import { coverUrl, type Song } from '@wts/topic-songs';
import type { Dish, Zoom } from '@wts/topic-food';
import type { PlaybackState } from '@/lib/audio/engine';
import { assetUrls } from '@/lib/assets/urls';
import { formatSeconds } from './PlayButton';
import { useI18n } from './I18nProvider';
import { FoodCredit } from './FoodCredit';

/** Spoiler-free history: wrong, skipped, correct, and not reached. */
export function shareSquares(round: Round<Song, number> | Round<Dish, Zoom>): string {
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
  nextButtonRef,
  autoFocusNext = true,
  foodPhotoUrl,
}: {
  round: Round<Song, number> | Round<Dish, Zoom>;
  playback?: PlaybackState;
  onListen?: () => void;
  onNext: () => void;
  nextButtonRef?: React.Ref<HTMLButtonElement>;
  autoFocusNext?: boolean;
  foodPhotoUrl?: string | null;
}) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [resolvedCover, setResolvedCover] = useState<string | null>(null);
  const [retriedCover, setRetriedCover] = useState(false);
  const won = round.status === 'won';
  const subject = round.subject;
  const dish = 'name' in subject ? subject : null;
  const song = 'title' in subject ? subject : null;
  const food = dish !== null;
  const cover = song ? coverUrl(song) : null;
  useEffect(() => {
    let active = true;
    setResolvedCover(null);
    setFailedCover(null);
    setRetriedCover(false);
    if (cover) void assetUrls.resolve(cover).then((url) => {
      if (active) setResolvedCover(url);
    }).catch(() => { if (active) setFailedCover(cover); });
    return () => { active = false; };
  }, [cover]);
  const at = food
    ? `${Math.round((round.stages[round.stageIndex] as Zoom).fraction * 100)}%`
    : formatSeconds(round.stages[round.stageIndex] as number);
  const longest = food ? 0 : round.stages[round.stages.length - 1] as number;
  const tier = TIERS.find((x) => x.slug === tierOf(subject))!;

  async function share() {
    const text = t(food ? 'food.shareText' : 'result.shareText', {
      tier: lang === 'vi' ? tier.label : tier.gloss,
      squares: shareSquares(round),
      outcome: won ? t(food ? 'food.shareWon' : 'result.shareWon', { at }) : t('result.shareLost'),
      score: round.score,
    });
    try {
      if (navigator.share) {
        try {
          await navigator.share({ text });
          return;
        } catch (error) {
          // A dismissed share sheet is deliberate; other native failures can
          // still be handled by the clipboard, as on browsers without Share.
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard unavailable or blocked. */
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
        <strong>{t('app.name')} / {t('result.heading')}</strong>
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
      <div className={food ? 'result-cover result-food-photo' : 'result-cover'}>
        {food && foodPhotoUrl ? (
          <img src={foodPhotoUrl} alt="" width={160} height={160} />
        ) : cover && resolvedCover && cover !== failedCover ? (
          // Static export: native image, with a fallback for missing cover files.
          <img
            src={resolvedCover}
            alt=""
            width={160}
            height={160}
            onError={() => {
              if (retriedCover) { setFailedCover(cover); return; }
              setRetriedCover(true);
              void assetUrls.resolve(cover, true).then((url) => {
                if (url === resolvedCover) setFailedCover(cover);
                else setResolvedCover(url);
              }).catch(() => setFailedCover(cover));
            }}
          />
        ) : (
          <span
            className="cover-initials"
            data-testid="cover-fallback"
            aria-hidden="true"
          >
            {initials(dish?.name ?? song?.title ?? '')}
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
          {dish?.name ?? song?.title}
        </h2>
        {song && <p className="result-artist">{song.artist}</p>}
        {dish && <FoodCredit credit={dish.credit} />}
      </div>
      <div className="result-summary">
        {won && <p className="result-clip">{food ? t('food.wonAt', { at }) : t('result.wonAt', { at })}</p>}
        <p className="result-score">
          {t('round.points', { n: won ? round.score : 0 })}
        </p>
      </div>
      <div
        className="result-history"
        role="list"
        aria-label={t('result.history')}
      >
        {round.stages.map((stage, i) => {
          const stageLabel = food ? `${Math.round((stage as Zoom).fraction * 100)}%` : formatSeconds(stage as number);
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
              key={i}
              className="history-stage"
              data-kind={kind}
              role="listitem"
              aria-label={t('result.stage', {
                n: i + 1,
                seconds: stageLabel,
                outcome,
              })}
              title={`${stageLabel} · ${outcome}`}
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
        {!food && <button
          className="pill"
          onClick={onListen}
          disabled={playback === 'loading'}
        >
          <span aria-hidden="true">{playback === 'playing' ? '■' : '▶'}</span>{' '}
          {playback === 'playing'
            ? t('round.stopLabel')
            : t('result.listen', { seconds: formatSeconds(longest) })}
        </button>}
        <button className="pill" onClick={() => void share()}>
          {copied ? t('result.copied') : t('result.share')}
        </button>
        <button ref={nextButtonRef} className="pill next-button" onClick={onNext} autoFocus={autoFocusNext}>
          {food ? t('food.next') : won ? t('result.next') : t('result.tryAgain')}{' '}
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
