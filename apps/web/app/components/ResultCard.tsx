'use client';

import { useState } from 'react';
import { coverUrl, TIERS, tierOf, type Round, type Song } from '@wts/game';
import type { PlaybackState } from '@/lib/audio/engine';
import { formatSeconds } from './PlayButton';
import { useI18n } from './I18nProvider';

/**
 * One square per stage, spoiler-free: 🟥 wrong guess, ⬛ skipped, 🟩 guessed,
 * ⬜ not reached. The row alone says how the round went.
 */
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

/**
 * The end of a round: the song, big, with a stamp saying how it went.
 * Replaces the round screen, so there is nothing else to look at.
 */
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
  const won = round.status === 'won';
  const song = round.song;
  const cover = coverUrl(song);
  const at = formatSeconds(round.stages[round.stageIndex]);
  const longest = round.stages[round.stages.length - 1];
  const glow = won ? 'rgba(30, 215, 96, 0.45)' : 'rgba(243, 114, 127, 0.45)';
  const tier = TIERS.find((x) => x.slug === tierOf(song))!;

  async function share() {
    const text = t('result.shareText', {
      tier: lang === 'vi' ? tier.label : tier.gloss,
      squares: shareSquares(round),
      outcome: won ? t('result.shareWon', { at }) : t('result.shareLost'),
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
      // Share sheet dismissed, or clipboard blocked: nothing to report.
    }
  }

  return (
    <section
      aria-live="polite"
      data-testid="result"
      data-status={round.status}
      style={{ display: 'grid', justifyItems: 'center', gap: 'var(--s-3)', textAlign: 'center' }}
    >
      <div
        style={{
          width: 176,
          height: 176,
          borderRadius: 'var(--r-panel)',
          overflow: 'hidden',
          boxShadow: `0 0 48px ${glow}`,
          background: 'linear-gradient(135deg, #2a2a2a, #161616)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {cover ? (
          // Plain <img>: the app is a static export, next/image cannot optimise.
          <img src={cover} alt="" width={176} height={176} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span data-testid="cover-fallback" aria-hidden="true" style={{ font: '800 56px/1 var(--font-ui)', color: 'var(--text-muted)' }}>
            {initials(song.title)}
          </span>
        )}
      </div>

      {!won && (
        <p style={{ margin: 0, font: 'var(--t-small-bold)', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text-negative)' }}>
          {t('result.itWas')}
        </p>
      )}
      <div>
        <h2 style={{ margin: 0, font: '800 26px/1.2 var(--font-ui)' }}>{song.title}</h2>
        <p style={{ margin: '4px 0 0', font: 'var(--t-caption)', color: 'var(--text-muted)' }}>{song.artist}</p>
      </div>

      <span className="stamp" style={{ color: won ? 'var(--accent)' : 'var(--text-negative)', margin: 'var(--s-2) 0' }}>
        {won ? t('result.guessedIn', { at }) : t('result.lost')}
      </span>

      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="pill" onClick={onListen} disabled={playback === 'loading'}>
          {playback === 'playing' ? '■' : '▶'} {t('result.listen', { seconds: formatSeconds(longest) })}
        </button>
        <button className="pill" onClick={() => void share()}>
          {copied ? t('result.copied') : t('result.share')}
        </button>
        <button className="pill pill--accent" onClick={onNext} autoFocus>
          {won ? t('result.next') : t('result.tryAgain')}
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
