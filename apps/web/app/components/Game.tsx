'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  availableGenres,
  clipUrl,
  createRound,
  filterByGenre,
  filterByTier,
  giveUp,
  indexCatalogue,
  isLastStage,
  ladderFor,
  playableSongs,
  revealedSeconds,
  scoreForStep,
  skip,
  submitGuess,
  tierCounts,
  tierOf,
  type IndexedSong,
  type Round,
  type Song,
  type TierSlug,
} from '@wts/game';
import { loadPrefs, savePrefs } from '@/lib/storage/prefs';
import { useAudioEngine } from './useAudioEngine';
import { PlayButton, formatSeconds } from './PlayButton';
import { Timeline } from './Timeline';
import { TierChips } from './TierChips';
import { GuessBar } from './GuessBar';
import { ResultCard } from './ResultCard';
import { MenuDrawer } from './GameMenu';
import { PillRow } from './PillRow';
import { LangToggle } from './LangToggle';
import { useI18n } from './I18nProvider';
import { StreakBar } from './StreakBar';
import { Leaderboard } from './Leaderboard';
import { useStats } from './useStats';

/** Pick a song at random, avoiding an immediate repeat. */
function pickRandom(items: Song[], excludeId?: string): Song | undefined {
  const pool = excludeId ? items.filter((s) => s.id !== excludeId) : items;
  // With a one-song pool there is nothing else to pick.
  const from = pool.length > 0 ? pool : items;
  return from[Math.floor(Math.random() * from.length)];
}

/**
 * The game: one round at a time, SongSpot-style.
 *
 * Round screen: difficulty chips, the timeline, the play button, the search
 * box. When the round ends the result replaces it. Genre, stats and language
 * live in the menu drawer.
 */
export function Game({ catalogue }: { catalogue: Song[] }) {
  // Drop songs with a gap in their clip ladder up front, rather than throwing
  // two reveals into a round.
  const [allSongs, skipped] = useMemo(
    () => playableSongs(catalogue),
    [catalogue],
  );

  const [genre, setGenre] = useState<string | null>(null);
  const [savedTier, setSavedTier] = useState<TierSlug | null>(null);
  const [round, setRound] = useState<Round<Song> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { stats, record, syncFailed, synced } = useStats();
  const { engine, state } = useAudioEngine();
  const { lang, t } = useI18n();
  const progress = useCallback(() => engine.progress(), [engine]);

  // Restore remembered choices on mount. Client-only: localStorage does not
  // exist during the static export's prerender.
  useEffect(() => {
    const prefs = loadPrefs();
    setGenre(prefs.genre);
    setSavedTier(prefs.tier);
  }, []);

  const genreOptions = useMemo(() => availableGenres(allSongs), [allSongs]);
  const inGenre = useMemo(
    () => filterByGenre(allSongs, genre),
    [allSongs, genre],
  );
  const tiers = useMemo(() => tierCounts(inGenre), [inGenre]);
  // The saved tier if it has songs here, else the easiest tier that does.
  const tier: TierSlug =
    (savedTier &&
      tiers.find((x) => x.tier.slug === savedTier && x.count > 0)?.tier.slug) ||
    tiers.find((x) => x.count > 0)?.tier.slug ||
    'medium';
  const songs = useMemo(() => filterByTier(inGenre, tier), [inGenre, tier]);
  // Search covers every playable song, not just this tier: a guess list that
  // only offered this tier's songs would give the answer away.
  const index = useMemo(() => indexCatalogue(allSongs), [allSongs]);

  const newRound = useCallback(
    (excludeId?: string) => {
      engine.stop();
      setError(null);
      const song = pickRandom(songs, excludeId);
      setRound(song ? createRound(song, ladderFor(song)) : null);
    },
    [songs, engine],
  );

  // A new pool (tier or genre changed) starts a new round.
  useEffect(() => newRound(), [newRound]);

  const playClip = useCallback(
    async (song: Song, seconds: number) => {
      try {
        // Always inside a click handler, which is what unlocks the
        // AudioContext on mobile Safari.
        await engine.play(clipUrl(song, seconds), seconds);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.playFailed'));
      }
    },
    [engine, t],
  );

  /**
   * Apply a transition. A newly finished round is recorded exactly once, here
   * in the event handler — never inside a setRound updater, which StrictMode
   * calls twice. A newly unlocked stage plays straight away: the click that
   * unlocked it is the gesture the browser needs.
   */
  const apply = useCallback(
    (next: Round<Song>) => {
      const before = round;
      setRound(next);
      if (!before || before.status !== 'playing') return;
      if (next.status !== 'playing') {
        record({
          songId: next.song.id,
          won: next.status === 'won',
          score: next.status === 'won' ? next.score : 0,
          difficulty: tierOf(next.song),
          genre,
        });
      } else if (next.stageIndex > before.stageIndex) {
        void playClip(next.song, revealedSeconds(next));
      }
    },
    [round, record, genre, playClip],
  );

  // Warm the next stage so revealing it feels immediate.
  useEffect(() => {
    if (!round || round.status !== 'playing') return;
    const next = round.stages[round.stageIndex + 1];
    if (next === undefined) return;
    try {
      engine.prefetch(clipUrl(round.song, next));
    } catch {
      /* missing clip; play() will report it */
    }
  }, [round, engine]);

  function onTier(slug: TierSlug) {
    setSavedTier(slug);
    savePrefs({ genre, tier: slug });
  }

  function onGenre(slug: string | null) {
    setGenre(slug);
    savePrefs({ genre: slug, tier: savedTier });
  }

  if (allSongs.length === 0) {
    return (
      <div className="state-card">
        <p style={{ font: 'var(--t-body-bold)', margin: '0 0 var(--s-2)' }}>
          {t('empty.noPlayable')}
        </p>
        <p
          style={{
            font: 'var(--t-caption)',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          {skipped.length > 0
            ? t('empty.incomplete', { n: skipped.length })
            : t('empty.catalogue')}
        </p>
      </div>
    );
  }

  const seconds = round ? revealedSeconds(round) : 0;
  const over = round !== null && round.status !== 'playing';
  const selectedGenre = genreOptions.find((g) => g.genre.slug === genre)?.genre;
  const genreLabel = selectedGenre
    ? lang === 'vi'
      ? selectedGenre.label
      : selectedGenre.gloss
    : t('picker.all');
  const nextSeconds = round?.stages[round.stageIndex + 1];

  return (
    <div className="game">
      <p className="filter-context">
        {t('picker.genre')}: <strong>{genreLabel}</strong>
      </p>
      {!over && <TierChips tiers={tiers} value={tier} onChange={onTier} />}

      {!round && (
        <p
          style={{
            font: 'var(--t-caption)',
            color: 'var(--text-muted)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {inGenre.length === 0 ? t('empty.genre') : t('difficulty.empty')}
        </p>
      )}

      {round && !over && (
        <>
          <section className="play-card" aria-labelledby="round-title">
            <div className="card-masthead">
              <strong>WTS / {t('round.live')}</strong>
              <span className="card-ticket">{t('app.editionShort')}</span>
            </div>
            <div className="clue-heading">
              <p>
                {t('round.clue', {
                  n: round.stageIndex + 1,
                  total: round.stages.length,
                })}
              </p>
              <span className="points-tag">
                {t('round.points', {
                  n: scoreForStep(round.stageIndex, round.stages.length),
                })}
              </span>
            </div>
            <h2 id="round-title" className="round-title">
              {t('round.title')}
            </h2>
            <p className="visually-hidden" role="status">
              {t('round.stageAnnouncement', {
                n: round.stageIndex + 1,
                total: round.stages.length,
                seconds: formatSeconds(seconds),
              })}
            </p>
            <Timeline
              stages={round.stages}
              stageIndex={round.stageIndex}
              playing={state === 'playing'}
              progress={progress}
            />
            <PlayButton
              state={state}
              seconds={seconds}
              onPlay={() => void playClip(round.song, seconds)}
              onStop={() => engine.stop()}
            />
            <p className="play-hint">{t('round.playHint')}</p>
          </section>
          <div className="answer-block">
            <label htmlFor="guess" className="field-label">
              {t('round.answer')}
            </label>
            <GuessBar
              key={round.song.id}
              index={index}
              lastStage={isLastStage(round)}
              onGuess={(song: IndexedSong) =>
                apply(submitGuess(round, { id: song.id, title: song.title }))
              }
              onSkip={() => apply(skip(round))}
              onGiveUp={() => apply(giveUp(round))}
            />
            <p className="answer-hint">
              {nextSeconds !== undefined
                ? t('round.skipCost', {
                    seconds: formatSeconds(nextSeconds),
                    points: scoreForStep(
                      round.stageIndex + 1,
                      round.stages.length,
                    ),
                  })
                : t('round.finalHint')}
            </p>
          </div>
        </>
      )}

      {round && over && (
        <ResultCard
          round={round}
          playback={state}
          onListen={() => {
            if (state === 'playing') engine.stop();
            else
              void playClip(round.song, round.stages[round.stages.length - 1]);
          }}
          onNext={() => newRound(round.song.id)}
        />
      )}

      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}

      {/* One quiet line of stats; the full numbers are in the menu. */}
      <p className="game-stats">
        <span>
          {t('stats.streak')} <strong>{stats.currentStreak}</strong>
        </span>
        {' · '}
        <span>
          {t('stats.best')} <strong>{stats.bestStreak}</strong>
        </span>
      </p>

      <MenuDrawer>
        <section>
          <h3
            style={{ margin: '0 0 var(--s-2)', font: 'var(--t-caption-bold)' }}
          >
            {t('menu.howTo')}
          </h3>
          <p
            style={{
              margin: 0,
              font: 'var(--t-caption)',
              color: 'var(--text-near-white)',
            }}
          >
            {t('menu.howToBody')}
          </p>
        </section>
        <PillRow
          label={t('picker.genre')}
          value={genre}
          onChange={onGenre}
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
        <StreakBar stats={stats} syncFailed={syncFailed} />
        <Leaderboard version={synced} />
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="field-label">{t('app.language')}</span>
          <LangToggle />
        </section>
      </MenuDrawer>
    </div>
  );
}
