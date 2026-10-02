'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createRound,
 filterByTier, pickSubject,
  giveUp,
  isLastStage,
  currentClue,
  scoreForStep,
  skip,
  submitGuess,
  tierCounts,
  tierOf,
  type Round,
  type TierSlug,
} from '@wts/core';
import {
  clipUrl, playableSongs, songsTopic, matchGuess,
  coverUrl,
  type Song,
} from '@wts/topic-songs';
import type { TopicId } from '@wts/topics';
import { loadPrefs, savePrefs } from '@/lib/storage/prefs';
import { assetUrls } from '@/lib/assets/urls';
import {
  memePath, memePool, prepareRoundAssets, type Meme, type MemeOutcome,
} from '@/lib/assets/memes';
import { useAudioEngine } from './useAudioEngine';
import { PlayButton, formatSeconds } from './PlayButton';
import { Timeline } from './Timeline';
import { TierChips } from './TierChips';
import { GuessBar } from './GuessBar';
import { ResultView } from './ResultView';
import { MenuDrawer } from './GameMenu';
import { PillRow } from './PillRow';
import { LangToggle } from './LangToggle';
import { useI18n } from './I18nProvider';
import { StreakBar } from './StreakBar';
import { Leaderboard } from './Leaderboard';
import { useStats } from './useStats';

/**
 * The game: one round at a time, SongSpot-style.
 *
 * Round screen: difficulty chips, the timeline, the play button, the search
 * box. When the round ends the result replaces it. Genre, stats and language
 * live in the menu drawer.
 */
export function Game({ catalogue, topicId }: { catalogue: Song[]; topicId: TopicId }) {
  // Drop songs with a gap in their clip ladder up front, rather than throwing
  // two reveals into a round.
  const [allSongs, skipped] = useMemo(
    () => playableSongs(catalogue),
    [catalogue],
  );

  const [facetValues, setFacetValues] = useState<Record<string, string | null>>({});
  const genre = facetValues.genre ?? null;
  const [savedTier, setSavedTier] = useState<TierSlug | null>(null);
  const [memesEnabled, setMemesEnabled] = useState(true);
  const [prefsReady, setPrefsReady] = useState(false);
  const [roundMemes, setRoundMemes] = useState<
    Record<MemeOutcome, { meme: Meme; url: string } | null>
  >({ won: null, lost: null });
  // Ids already played, so a Subject is not repeated until the pool is used up.
  const playedRef = useRef(new Set<string>());
  const [round, setRound] = useState<Round<Song, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { stats, record, syncFailed, synced } = useStats();
  const { engine, state } = useAudioEngine();
  const { lang, t } = useI18n();
  const progress = useCallback(() => engine.progress(), [engine]);

  // Restore remembered choices on mount. Client-only: localStorage does not
  // exist during the static export's prerender.
  useEffect(() => {
    const prefs = loadPrefs();
    setFacetValues({ genre: prefs.genre });
    setSavedTier(prefs.tier);
    setMemesEnabled(prefs.memes);
    setPrefsReady(true);
  }, []);

  const facets = songsTopic.facets ?? [];
  const facetOptions = useMemo(
    () => facets.map((facet) => ({ facet, options: facet.options(allSongs) })),
    [allSongs],
  );
  const inFacet = useMemo(
    () => allSongs.filter((song) => facets.every((facet) =>
      !facetValues[facet.id] || facet.value(song) === facetValues[facet.id])),
    [allSongs, facetValues],
  );
  const tiers = useMemo(() => tierCounts(inFacet), [inFacet]);
  // The saved tier if it has songs here, else the easiest tier that does.
  const tier: TierSlug =
    (savedTier &&
      tiers.find((x) => x.tier.slug === savedTier && x.count > 0)?.tier.slug) ||
    tiers.find((x) => x.count > 0)?.tier.slug ||
    'medium';
  const songs = useMemo(() => filterByTier(inFacet, tier), [inFacet, tier]);
  // Search covers every playable song, not just this tier: a guess list that
  // only offered this tier's songs would give the answer away.

  const newRound = useCallback(
    () => {
      engine.stop();
      setError(null);
      setRoundMemes({ won: null, lost: null });
      const song = pickSubject(songs, playedRef.current);
      setRound(song ? createRound(song, songsTopic.ladder(song)) : null);
    },
    [songs, engine],
  );

  // A new pool (tier or genre changed) starts a new round.
  useEffect(() => newRound(), [newRound]);

  // Sign every asset for this Round together; the client refreshes stale URLs
  // when an uncached Stage is eventually fetched.
  useEffect(() => {
    if (!round || !prefsReady) return;
    let active = true;
    const paths = round.stages.map((seconds) => clipUrl(round.subject, seconds));
    const cover = coverUrl(round.subject);
    if (cover) paths.push(cover);
    void prepareRoundAssets(paths, memesEnabled)
      .then(async (selected) => {
        const resolved = await Promise.all(
          (['won', 'lost'] as const).map(async (outcome) => {
            const meme = selected[outcome];
            if (!meme) return null;
            try { return { meme, url: await assetUrls.resolve(memePath(meme)) }; }
            catch { return null; }
          }),
        );
        if (active) setRoundMemes({ won: resolved[0], lost: resolved[1] });
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : t('error.playFailed'));
      });
    return () => {
      active = false;
    };
  }, [round?.subject.id, round?.stages, memesEnabled, prefsReady]);

  useEffect(() => {
    if (!round || round.status === 'playing') return;
    const selected = roundMemes[round.status];
    if (selected && memesEnabled) memePool.markShown(round.status, selected.meme);
  }, [round?.status, roundMemes, memesEnabled]);

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
    (next: Round<Song, number>) => {
      const before = round;
      setRound(next);
      if (!before || before.status !== 'playing') return;
      if (next.status !== 'playing') {
        record({
          topic: topicId,
          subjectId: next.subject.id,
          won: next.status === 'won',
          score: next.status === 'won' ? next.score : 0,
          difficulty: tierOf(next.subject),
          facet: genre,
        });
      } else if (next.stageIndex > before.stageIndex) {
        void playClip(next.subject, currentClue(next));
      }
    },
    [round, record, genre, playClip, topicId],
  );

  // Warm the next stage so revealing it feels immediate.
  useEffect(() => {
    if (!round || round.status !== 'playing') return;
    const next = round.stages[round.stageIndex + 1];
    if (next === undefined) return;
    try {
      engine.prefetch(clipUrl(round.subject, next));
    } catch {
      /* missing clip; play() will report it */
    }
  }, [round, engine]);

  function onTier(slug: TierSlug) {
    setSavedTier(slug);
    savePrefs({ genre, tier: slug, memes: memesEnabled });
  }

  function onFacet(id: string, value: string | null) {
    setFacetValues((values) => ({ ...values, [id]: value }));
    if (id === 'genre') savePrefs({ genre: value, tier: savedTier, memes: memesEnabled });
  }

  function onMemes(enabled: boolean) {
    setMemesEnabled(enabled);
    if (!enabled) setRoundMemes({ won: null, lost: null });
    savePrefs({ genre, tier: savedTier, memes: enabled });
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

  const seconds = round ? currentClue(round) : 0;
  const over = round !== null && round.status !== 'playing';
  const selectedFacets = facetOptions.map(({ facet, options }) => ({
    facet,
    label: options.find((option) => option.value === facetValues[facet.id])?.labels[lang] ?? t('picker.all'),
  }));
  const nextSeconds = round?.stages[round.stageIndex + 1];

  return (
    <div className="game">
      <p className="filter-context">
        {selectedFacets.map(({ facet, label }) => (
          <span key={facet.id}>{facet.labels[lang]}: <strong>{label}</strong></span>
        ))}
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
          {inFacet.length === 0 ? t('empty.genre') : t('difficulty.empty')}
        </p>
      )}

      {round && !over && (
        <>
          <section
            key={`${round.subject.id}-${round.stageIndex}`}
            className={`play-card round-card${round.attempts[round.stageIndex - 1]?.kind === 'skip' ? ' round-card--skip' : ''}`}
            aria-labelledby="round-title"
          >
            <div className="card-masthead">
              <strong>{t('app.name')} / {t('round.live')}</strong>
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
                  n: scoreForStep(round.stageIndex, round.stages.length, tierOf(round.subject)),
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
              onPlay={() => void playClip(round.subject, seconds)}
              onStop={() => engine.stop()}
            />
            <p className="play-hint">{t('round.playHint')}</p>
          </section>
          <div className="answer-block">
            <label htmlFor="guess" className="field-label">
              {t('round.answer')}
            </label>
            <GuessBar
              key={round.subject.id}
              lastStage={isLastStage(round)}
              lastWrong={
                [...round.attempts]
                  .reverse()
                  .find((a) => a.kind === 'guess' && a.quality === 'none')?.text
              }
              onGuess={(text: string) => apply(submitGuess(round, text, matchGuess))}
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
                      tierOf(round.subject),
                    ),
                  })
                : t('round.finalHint')}
            </p>
          </div>
        </>
      )}

      {round && over && (
        <ResultView
          round={round}
          memes={memesEnabled ? roundMemes : undefined}
          playback={state}
          onListen={() => {
            if (state === 'playing') engine.stop();
            else
              void playClip(round.subject, round.stages[round.stages.length - 1]);
          }}
          onNext={() => newRound()}
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
        {facetOptions.map(({ facet, options }) => (
          <PillRow
            key={facet.id}
            label={facet.labels[lang]}
            value={facetValues[facet.id] ?? null}
            onChange={(value) => onFacet(facet.id, value)}
            options={[
              { value: null, label: t('picker.all'), count: allSongs.length },
              ...options.map((option) => ({
                value: option.value,
                label: option.labels[lang],
                hint: option.labels[lang === 'vi' ? 'en' : 'vi'],
                count: option.count,
              })),
            ]}
          />
        ))}
        <StreakBar stats={stats} syncFailed={syncFailed} />
        <Leaderboard version={synced} topic={topicId} />
        <section className="memes-setting">
          <label htmlFor="memes-toggle" className="field-label">{t('menu.memes')}</label>
          <input
            id="memes-toggle"
            type="checkbox"
            checked={memesEnabled}
            onChange={(event) => onMemes(event.target.checked)}
          />
        </section>
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
