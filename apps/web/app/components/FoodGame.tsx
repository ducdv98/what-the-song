'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createRound, currentClue, filterByTier, giveUp, isLastStage, scoreForStep,
  skip, submitGuess, tierCounts, tierOf, type Round, type TierSlug,
} from '@wts/core';
import { foodTopic, matchGuess, type Dish, type Zoom } from '@wts/topic-food';
import { assetUrls } from '@/lib/assets/urls';
import { memePath, memePool, prepareRoundAssets, type Meme, type MemeOutcome } from '@/lib/assets/memes';
import { loadPrefs, savePrefs } from '@/lib/storage/prefs';
import { FoodZoom } from './FoodZoom';
import { GuessBar } from './GuessBar';
import { MenuDrawer } from './GameMenu';
import { LangToggle } from './LangToggle';
import { Leaderboard } from './Leaderboard';
import { PillRow } from './PillRow';
import { ResultView } from './ResultView';
import { StreakBar } from './StreakBar';
import { TierChips } from './TierChips';
import { useI18n } from './I18nProvider';
import { useStats } from './useStats';

function pickRandom(items: Dish[], excludeId?: string): Dish | undefined {
  const pool = excludeId ? items.filter((dish) => dish.id !== excludeId) : items;
  const from = pool.length ? pool : items;
  return from[Math.floor(Math.random() * from.length)];
}

export function FoodGame({ catalogue }: { catalogue: Dish[] }) {
  const [region, setRegion] = useState<string | null>(null);
  const [savedTier, setSavedTier] = useState<TierSlug | null>(null);
  const [memesEnabled, setMemesEnabled] = useState(true);
  const [prefsReady, setPrefsReady] = useState(false);
  const [round, setRound] = useState<Round<Dish, Zoom> | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [roundMemes, setRoundMemes] = useState<Record<MemeOutcome, { meme: Meme; url: string } | null>>({ won: null, lost: null });
  const [error, setError] = useState<string | null>(null);
  const { stats, record, syncFailed, synced } = useStats();
  const { lang, t } = useI18n();
  const facet = foodTopic.facets![0];

  useEffect(() => {
    const prefs = loadPrefs();
    setSavedTier(prefs.tier);
    setMemesEnabled(prefs.memes);
    setPrefsReady(true);
  }, []);

  const options = useMemo(() => facet.options(catalogue), [catalogue, facet]);
  const inRegion = useMemo(() => catalogue.filter((dish) => !region || facet.value(dish) === region), [catalogue, facet, region]);
  const tiers = useMemo(() => tierCounts(inRegion), [inRegion]);
  const tier: TierSlug =
    (savedTier && tiers.find((item) => item.tier.slug === savedTier && item.count > 0)?.tier.slug) ||
    tiers.find((item) => item.count > 0)?.tier.slug || 'medium';
  const dishes = useMemo(() => filterByTier(inRegion, tier), [inRegion, tier]);

  const newRound = useCallback((excludeId?: string) => {
    setError(null);
    setPhotoUrl(null);
    setRoundMemes({ won: null, lost: null });
    const dish = pickRandom(dishes, excludeId);
    setRound(dish ? createRound(dish, foodTopic.ladder(dish)) : null);
  }, [dishes]);

  useEffect(() => newRound(), [newRound]);

  useEffect(() => {
    if (!round || !prefsReady) return;
    let active = true;
    const photo = `/assets/food/${round.subject.id}/${round.subject.photo}`;
    void prepareRoundAssets([photo], memesEnabled)
      .then(async (selected) => {
        const [url, won, lost] = await Promise.all([
          assetUrls.resolve(photo),
          selected.won ? assetUrls.resolve(memePath(selected.won)).then((url) => ({ meme: selected.won!, url })).catch(() => null) : null,
          selected.lost ? assetUrls.resolve(memePath(selected.lost)).then((url) => ({ meme: selected.lost!, url })).catch(() => null) : null,
        ]);
        if (active) {
          setPhotoUrl(url);
          setRoundMemes({ won, lost });
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load the photo.');
      });
    return () => { active = false; };
  }, [round?.subject.id, memesEnabled, prefsReady]);

  useEffect(() => {
    if (!round || round.status === 'playing') return;
    const selected = roundMemes[round.status];
    if (selected && memesEnabled) memePool.markShown(round.status, selected.meme);
  }, [round?.status, roundMemes, memesEnabled]);

  function apply(next: Round<Dish, Zoom>) {
    const before = round;
    setRound(next);
    if (!before || before.status !== 'playing' || next.status === 'playing') return;
    record({
      topic: 'food', subjectId: next.subject.id, won: next.status === 'won',
      score: next.status === 'won' ? next.score : 0,
      difficulty: tierOf(next.subject), facet: facet.value(next.subject),
    });
  }

  function onTier(value: TierSlug) {
    setSavedTier(value);
    savePrefs({ ...loadPrefs(), tier: value, memes: memesEnabled });
  }

  function onMemes(value: boolean) {
    setMemesEnabled(value);
    if (!value) setRoundMemes({ won: null, lost: null });
    savePrefs({ ...loadPrefs(), tier: savedTier, memes: value });
  }

  const over = round !== null && round.status !== 'playing';
  const zoom = round ? currentClue(round) : null;
  const nextZoom = round?.stages[round.stageIndex + 1];
  const regionLabel = options.find((option) => option.value === region)?.labels[lang] ?? t('picker.all');

  return (
    <div className="game">
      <p className="filter-context"><span>{facet.labels[lang]}: <strong>{regionLabel}</strong></span></p>
      {!over && <TierChips topic="food" tiers={tiers} value={tier} onChange={onTier} />}
      {!round && <p className="answer-hint">{inRegion.length ? t('food.emptyTier') : t('food.emptyRegion')}</p>}

      {round && !over && zoom && (
        <>
          <section className="play-card round-card" aria-labelledby="round-title">
            <div className="card-masthead">
              <strong>{t('app.name')} / {t('round.live')}</strong>
              <span className="card-ticket">{t('food.appEdition')}</span>
            </div>
            <div className="clue-heading">
              <p>{t('round.clue', { n: round.stageIndex + 1, total: round.stages.length })}</p>
              <span className="points-tag">{t('round.points', { n: scoreForStep(round.stageIndex, round.stages.length, tierOf(round.subject)) })}</span>
            </div>
            <h2 id="round-title" className="round-title">{t('food.title')}</h2>
            <p className="visually-hidden" role="status">{t('food.stageAnnouncement', { n: round.stageIndex + 1, total: round.stages.length, percent: Math.round(zoom.fraction * 100) })}</p>
            <div className="stage-strip" role="list" aria-label={t('food.stages')}>
              {round.stages.map((stage, index) => (
                <div
                  key={index} role="listitem" aria-current={index === round.stageIndex ? 'step' : undefined}
                  className={`stage-marker${index === round.stageIndex ? ' stage-marker--current' : index < round.stageIndex ? ' stage-marker--unlocked' : ''}`}
                >
                  <span>{Math.round(stage.fraction * 100)}%</span><small>{String(index + 1).padStart(2, '0')}</small>
                </div>
              ))}
            </div>
            <FoodZoom zoom={zoom} url={photoUrl} />
          </section>
          <div className="answer-block">
            <label htmlFor="guess" className="field-label">{t('food.answer')}</label>
            <GuessBar
              topic="food"
              key={round.subject.id}
              lastStage={isLastStage(round)}
              lastWrong={[...round.attempts].reverse().find((attempt) => attempt.kind === 'guess' && attempt.quality === 'none')?.text}
              onGuess={(guess) => apply(submitGuess(round, guess, (text, dish) => matchGuess(text, dish) ? 'exact' : 'none'))}
              onSkip={() => apply(skip(round))}
              onGiveUp={() => apply(giveUp(round))}
            />
            <p className="answer-hint">{nextZoom
              ? t('food.skipCost', { percent: Math.round(nextZoom.fraction * 100), points: scoreForStep(round.stageIndex + 1, round.stages.length, tierOf(round.subject)) })
              : t('food.finalHint')}</p>
          </div>
        </>
      )}

      {round && over && <ResultView round={round} foodPhotoUrl={photoUrl} memes={memesEnabled ? roundMemes : undefined} onNext={() => newRound(round.subject.id)} />}
      {error && <p role="alert" className="inline-error">{error}</p>}
      <p className="game-stats"><span>{t('stats.streak')} <strong>{stats.currentStreak}</strong></span>{' · '}<span>{t('stats.best')} <strong>{stats.bestStreak}</strong></span></p>

      <MenuDrawer>
        <section><h3 style={{ margin: '0 0 var(--s-2)', font: 'var(--t-caption-bold)' }}>{t('menu.howTo')}</h3><p style={{ margin: 0, font: 'var(--t-caption)', color: 'var(--text-near-white)' }}>{t('food.howTo')}</p></section>
        <PillRow
          label={facet.labels[lang]} value={region} onChange={setRegion}
          options={[{ value: null, label: t('picker.all'), count: catalogue.length }, ...options.map((option) => ({ value: option.value, label: option.labels[lang], hint: option.labels[lang === 'vi' ? 'en' : 'vi'], count: option.count }))]}
        />
        <StreakBar stats={stats} syncFailed={syncFailed} />
        <Leaderboard version={synced} topic="food" />
        <section className="memes-setting"><label htmlFor="memes-toggle" className="field-label">{t('menu.memes')}</label><input id="memes-toggle" type="checkbox" checked={memesEnabled} onChange={(event) => onMemes(event.target.checked)} /></section>
        <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="field-label">{t('app.language')}</span><LangToggle /></section>
      </MenuDrawer>
    </div>
  );
}
