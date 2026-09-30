'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clipUrl, indexCatalogue, ladderFor, playableSongs, type Song } from '@/lib/catalogue';
import { DEFAULT_LADDER } from '@/lib/audio/engine';
import {
  createRound, giveUp, revealedSeconds, skip, submitGuess, type Round,
} from '@/lib/game/round';
import { availableGenres, filterByGenre } from '@/lib/game/genres';
import { DIFFICULTIES, findDifficulty } from '@/lib/game/difficulty';
import type { MessageKey } from '@/lib/i18n/messages';
import { loadStats, recordResult, saveStats, EMPTY_STATS, type Stats } from '@/lib/game/stats';
import { loadPrefs, savePrefs } from '@/lib/game/prefs';
import { useAudioEngine } from './useAudioEngine';
import { PlayButton, formatSeconds } from './PlayButton';
import { RevealLadder } from './RevealLadder';
import { Lives } from './Lives';
import { GuessInput } from './GuessInput';
import { PillRow } from './PillRow';
import { LangToggle } from './LangToggle';
import { useI18n } from './I18nProvider';
import { StreakBar } from './StreakBar';

/** Pick a song at random, avoiding an immediate repeat. */
function pickRandom(items: Song[], excludeId?: string): Song | undefined {
  const pool = excludeId ? items.filter((s) => s.id !== excludeId) : items;
  // With a one-song pool there is nothing else to pick.
  const from = pool.length > 0 ? pool : items;
  return from[Math.floor(Math.random() * from.length)];
}

export function Game({ catalogue }: { catalogue: Song[] }) {
  // Drop songs with a gap in their clip ladder up front, rather than throwing
  // two reveals into a round.
  const [allSongs, skipped] = useMemo(() => playableSongs(catalogue), [catalogue]);

  const [genre, setGenre] = useState<string | null>(null);
  const [difficultySlug, setDifficultySlug] = useState('normal');
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [round, setRound] = useState<Round<Song> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { engine, state } = useAudioEngine();
  const { lang, t } = useI18n();
  const difficulty = findDifficulty(difficultySlug);

  // Restore remembered choices and streak on mount. Client-only: localStorage
  // does not exist during the static export's prerender.
  useEffect(() => {
    const prefs = loadPrefs();
    setGenre(prefs.genre);
    setDifficultySlug(prefs.difficulty);
    setStats(loadStats());
  }, []);

  const genreOptions = useMemo(() => availableGenres(allSongs), [allSongs]);
  const songs = useMemo(() => filterByGenre(allSongs, genre), [allSongs, genre]);
  const index = useMemo(() => indexCatalogue(songs), [songs]);

  const startRound = useCallback(
    (excludeId?: string) => {
      const song = pickRandom(songs, excludeId);
      if (!song) {
        setRound(null);
        return;
      }
      setError(null);
      engine.stop();
      setRound(createRound(song, ladderFor(song), difficulty));
    },
    [songs, engine, difficulty],
  );

  // Start a round, and restart whenever the pool or the rules change — a
  // half-played round under the old difficulty would be meaningless.
  useEffect(() => {
    engine.stop();
    const song = pickRandom(songs);
    setRound(song ? createRound(song, ladderFor(song), difficulty) : null);
    setError(null);
  }, [songs, difficulty, engine]);

  /**
   * Apply a transition, folding a newly-finished round into the streak once.
   *
   * Deliberately NOT done inside a setRound updater: React calls updaters twice
   * under StrictMode to surface impurity, which would double-count every win.
   * Updaters stay pure; the side effect lives here, in the event handler, where
   * `round` from the closure is already current.
   */
  const apply = useCallback(
    (next: Round<Song>) => {
      const before = round;
      setRound(next);
      if (before && before.status === 'playing' && next.status !== 'playing') {
        const updated = recordResult(stats, next.status === 'won');
        setStats(updated);
        saveStats(updated);
      }
    },
    [round, stats],
  );

  const seconds = round ? revealedSeconds(round) : DEFAULT_LADDER[0];

  // Warm the next rung so revealing feels immediate.
  useEffect(() => {
    if (!round || round.status !== 'playing') return;
    const next = round.ladder[round.stepIndex + 1];
    if (next === undefined) return;
    try {
      engine.prefetch(clipUrl(round.song, next));
    } catch {
      /* rung missing; play() will report it */
    }
  }, [round, engine]);

  const play = useCallback(async () => {
    if (!round) return;
    try {
      // Inside a click handler, which is what unlocks the AudioContext on
      // mobile Safari.
      await engine.play(clipUrl(round.song, seconds), seconds);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.playFailed'));
    }
  }, [engine, round, seconds]);

  function onPick(slug: string | null) {
    setGenre(slug);
    savePrefs({ genre: slug, difficulty: difficultySlug });
  }

  function onDifficulty(slug: string) {
    setDifficultySlug(slug);
    savePrefs({ genre, difficulty: slug });
  }

  const pickers = (
    <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
      <PillRow
        label={t('picker.genre')}
        value={genre}
        onChange={onPick}
        options={[
          { value: null, label: t('picker.all'), count: allSongs.length },
          // In Vietnamese the genre's own name is the label; in English the
          // gloss is more use, with the Vietnamese name kept as the tooltip.
          ...genreOptions.map((g) => ({
            value: g.genre.slug as string | null,
            label: lang === 'vi' ? g.genre.label : g.genre.gloss,
            hint: lang === 'vi' ? g.genre.gloss : g.genre.label,
            count: g.count,
          })),
        ]}
      />
      <PillRow
        label={t('picker.difficulty')}
        value={difficultySlug}
        onChange={onDifficulty}
        options={DIFFICULTIES.map((d) => ({
          value: d.slug,
          label: t(`difficulty.${d.slug}` as MessageKey),
          hint: t(`difficulty.${d.slug}.gloss` as MessageKey),
        }))}
      />
    </div>
  );

  if (allSongs.length === 0) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <p style={{ font: 'var(--t-body-bold)', margin: '0 0 var(--s-2)' }}>
          {t('empty.noPlayable')}
        </p>
        <p style={{ font: 'var(--t-caption)', color: 'var(--text-muted)', margin: 0 }}>
          {skipped.length > 0
            ? t('empty.incomplete', { n: skipped.length })
            : t('empty.catalogue')}
        </p>
      </div>
    );
  }

  const over = round !== null && round.status !== 'playing';
  const song = round?.song;

  return (
    <div style={{ display: 'grid', gap: 'var(--s-6)', maxWidth: 560 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ font: 'var(--t-section-title)', margin: 0 }}>{t('app.tagline')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
          {round && <Lives livesLeft={round.livesLeft} maxLives={round.maxLives} />}
          <LangToggle />
        </div>
      </header>

      {!round && (
        <p style={{ font: 'var(--t-caption)', color: 'var(--text-muted)', margin: 0 }}>
          {t('empty.genre')}
        </p>
      )}

      {round && song && (
        <>
          <div className="card card--elevated" style={{ display: 'grid', gap: 'var(--s-5)' }}>
            {/* Stays enabled after the round: hearing the clue again is the
                natural next thing, and it makes a separate replay button
                redundant. */}
            <PlayButton state={state} seconds={seconds} onPlay={play} />
            <RevealLadder stepIndex={round.stepIndex} ladder={round.ladder} />
          </div>

          {error && (
            <p role="alert" style={{ font: 'var(--t-caption)', color: 'var(--text-negative)', margin: 0 }}>
              {error}
            </p>
          )}

          {!over && (
            <>
              <GuessInput
                index={index}
                onGuess={(title) => apply(submitGuess(round, title))}
              />
              <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
                {round.allowSkip && (
                  <button className="pill" onClick={() => apply(skip(round))}>
                    {t('round.revealMore')}
                  </button>
                )}
                <button
                  className="pill pill--outlined pill--muted"
                  onClick={() => apply(giveUp(round))}
                >
                  {t('round.giveUp')}
                </button>
              </div>
            </>
          )}

          {over && (
            <div className="card" style={{ display: 'grid', gap: 'var(--s-4)' }}>
              <div>
                <p
                  style={{
                    font: 'var(--t-caption-bold)',
                    letterSpacing: '1.4px',
                    textTransform: 'uppercase',
                    color: round.status === 'won' ? 'var(--accent)' : 'var(--text-negative)',
                    margin: '0 0 var(--s-2)',
                  }}
                >
                  {round.status === 'won' ? t('round.correct') : t('round.lost')}
                </p>
                <p style={{ font: 'var(--t-body-bold)', margin: 0 }}>{song.title}</p>
                <p style={{ font: 'var(--t-caption)', color: 'var(--text-muted)', margin: 0 }}>
                  {song.artist}
                </p>
              </div>

              <p style={{ font: 'var(--t-small)', color: 'var(--text-muted)', margin: 0 }}>
                {round.status === 'won'
                  ? t('round.score', { score: round.score, at: formatSeconds(seconds) })
                  : t('round.revealedTo', { at: formatSeconds(seconds) })}
              </p>

              <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
                <button className="pill pill--accent" onClick={() => startRound(song.id)}>
                  {t('round.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Settings and stats sit below the game: they are touched once a
          session, while the card above is used every round. */}
      <StreakBar stats={stats} />
      {pickers}
    </div>
  );
}
