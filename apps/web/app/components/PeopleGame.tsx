'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createRound, currentClue, filterByTier, pickSubject, giveUp, isLastStage, scoreForStep,
  revealMore, submitGuess, tierCounts, tierOf, warmUpRound, warmUpSubjects, type Round, type TierSlug,
} from '@wts/core';
import { peopleTopic, matchGuess, type Person, type Reveal } from '@wts/topic-people';
import { assetUrls } from '@/lib/assets/urls';
import { memePath, memePool, prepareRoundAssets, type Meme, type MemeOutcome } from '@/lib/assets/memes';
import { loadPrefs, savePrefs } from '@/lib/storage/prefs';
import { RevealPhoto } from './RevealPhoto';
import { GuessBar } from './GuessBar';
import { MenuDrawer } from './GameMenu';
import { LangToggle } from './LangToggle';
import { Leaderboard } from './Leaderboard';
import { PillRow } from './PillRow';
import { ResultView } from './ResultView';
import type { ResultContext } from '@/lib/celebration';
import { StreakBar } from './StreakBar';
import { TierChips } from './TierChips';
import { useI18n } from './I18nProvider';
import { useStats } from './useStats';
import { useWarmUp } from './useWarmUp';

export function PeopleGame({ catalogue }: { catalogue: Person[] }) {
  const [field, setField] = useState<string | null>(null);
  const [savedTier, setSavedTier] = useState<TierSlug | null>(null);
  const [memesEnabled, setMemesEnabled] = useState(true);
  const [prefsReady, setPrefsReady] = useState(false);
  // Ids already played, so a Subject is not repeated until the pool is used up.
  const playedRef = useRef(new Set<string>());
  const roundWasWarmUp = useRef(false);
  const resultContext = useRef<ResultContext>({ wasWarmUp: false, firstWarmUpWin: false, streak: 0, previousStreak: 0, bestStreak: 0 });
  const [round, setRound] = useState<Round<Person, Reveal> | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [roundMemes, setRoundMemes] = useState<Record<MemeOutcome, { meme: Meme; url: string } | null>>({ won: null, lost: null });
  const [error, setError] = useState<string | null>(null);
  const { stats, record, syncFailed, synced, topicPlayed, userId } = useStats('people');
  const warmUp = useWarmUp('people', savedTier, topicPlayed, userId);
  const { lang, t } = useI18n();
  const facet = peopleTopic.facets![0];

  useEffect(() => {
    const prefs = loadPrefs();
    setSavedTier(prefs.tier);
    setMemesEnabled(prefs.memes);
    setPrefsReady(true);
  }, []);

  const options = useMemo(() => facet.options(catalogue), [catalogue, facet]);
  const inField = useMemo(() => catalogue.filter((person) => !field || facet.value(person) === field), [catalogue, facet, field]);
  const tiers = useMemo(() => tierCounts(inField), [inField]);
  const tier: TierSlug =
    (savedTier && tiers.find((item) => item.tier.slug === savedTier && item.count > 0)?.tier.slug) ||
    tiers.find((item) => item.count > 0)?.tier.slug || 'medium';
  const people = useMemo(() => filterByTier(inField, tier), [inField, tier]);

  const newRound = useCallback(() => {
    setError(null);
    setPhotoUrl(null);
    setRoundMemes({ won: null, lost: null });
    const active = warmUp.active;
    const next = active
      ? warmUpRound(warmUpSubjects(catalogue, inField), playedRef.current, peopleTopic.ladder)
      : (() => { const person = pickSubject(people, playedRef.current); return person ? createRound(person, peopleTopic.ladder(person)) : null; })();
    roundWasWarmUp.current = active && next !== null;
    setRound(next);
  }, [people, catalogue, inField, warmUp.active]);

  useEffect(() => { if (prefsReady && warmUp.ready && (!round || round.status === 'playing')) newRound(); }, [newRound, prefsReady, warmUp.ready]);

  useEffect(() => {
    if (!round || !prefsReady) return;
    let active = true;
    const photo = `/assets/people/${round.subject.id}/${round.subject.photo}`;
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
        if (active) setError(err instanceof Error ? err.message : t('people.photoError'));
      });
    return () => { active = false; };
  }, [round?.subject.id, memesEnabled, prefsReady]);

  useEffect(() => {
    if (!round || round.status === 'playing') return;
    const selected = roundMemes[round.status];
    if (selected && memesEnabled) memePool.markShown(round.status, selected.meme);
  }, [round?.status, roundMemes, memesEnabled]);

  function apply(next: Round<Person, Reveal>) {
    const before = round;
    setRound(next);
    if (!before || before.status !== 'playing' || next.status === 'playing') return;
    resultContext.current = { wasWarmUp: roundWasWarmUp.current, firstWarmUpWin: roundWasWarmUp.current && next.status === 'won', streak: next.status === 'won' ? stats.currentStreak + 1 : 0, previousStreak: stats.currentStreak, bestStreak: stats.bestStreak };
    warmUp.finish(next.status === 'won', roundWasWarmUp.current);
    record({
      topic: 'people', subjectId: next.subject.id, won: next.status === 'won',
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
  const reveal = round ? currentClue(round) : null;
  const nextReveal = round?.stages[round.stageIndex + 1];
  const fieldLabel = options.find((option) => option.value === field)?.labels[lang] ?? t('picker.all');

  return (
    <div className="game">
      <p className="filter-context"><span>{facet.labels[lang]}: <strong>{fieldLabel}</strong></span></p>
      {!over && <TierChips topic="people" tiers={tiers} value={tier} onChange={onTier} />}
      {!round && <p className="answer-hint">{inField.length ? t('people.emptyTier') : t('people.emptyField')}</p>}

      {round && !over && reveal && (
        <>
          <section className="play-card round-card" aria-labelledby="round-title">
            <div className="card-masthead">
              <strong>{t('app.name')} / {t('round.live')}</strong>
              <span className="card-ticket">{t('people.appEdition')}</span>
            </div>
            <div className="clue-heading">
              <p>{t('round.clue', { n: round.stageIndex + 1, total: round.stages.length })}</p>
              <span className="points-tag">{t('round.points', { n: scoreForStep(round.stageIndex, round.stages.length, tierOf(round.subject)) })}</span>
            </div>
            <h2 id="round-title" className="round-title">{t('people.title')}</h2>
            <p className="visually-hidden" role="status">{t('people.stageAnnouncement', { n: round.stageIndex + 1, total: round.stages.length, percent: Math.round(reveal.fraction * 100) })}</p>
            <div className="stage-strip" role="list" aria-label={t('people.stages')}>
              {round.stages.map((stage, index) => (
                <div
                  key={index} role="listitem" aria-current={index === round.stageIndex ? 'step' : undefined}
                  className={`stage-marker${index === round.stageIndex ? ' stage-marker--current' : index < round.stageIndex ? ' stage-marker--unlocked' : ''}`}
                >
                  <span>{Math.round(stage.fraction * 100)}%</span><small>{String(index + 1).padStart(2, '0')}</small>
                </div>
              ))}
            </div>
            <RevealPhoto reveal={reveal} url={photoUrl} />
          </section>
          <div className="answer-block">
            <label htmlFor="guess" className="field-label">{t('people.answer')}</label>
            <GuessBar
              topic="people"
              key={round.subject.id}
              lastStage={isLastStage(round)}
              lastWrong={[...round.attempts].reverse().find((attempt) => attempt.kind === 'guess' && attempt.quality === 'none')?.text}
              onGuess={(guess) => apply(submitGuess(round, guess, (text, person) => matchGuess(text, person) ? 'exact' : 'none'))}
              onRevealMore={() => apply(revealMore(round))}
              revealCost={nextReveal ? t('people.revealCost', { percent: Math.round(nextReveal.fraction * 100), points: scoreForStep(round.stageIndex + 1, round.stages.length, tierOf(round.subject)) }) : undefined}
              onGiveUp={() => apply(giveUp(round))}
            />
            {!nextReveal && <p className="answer-hint">{t('people.finalHint')}</p>}
          </div>
        </>
      )}

      {round && over && <ResultView round={round} resultContext={resultContext.current} nextWarmUp={roundWasWarmUp.current && warmUp.active} peoplePhotoUrl={photoUrl} memes={memesEnabled ? roundMemes : undefined} onNext={() => newRound()} />}
      {error && <p role="alert" className="inline-error">{error}</p>}
      <p className="game-stats"><span>{t('stats.streak')} <strong>{stats.currentStreak}</strong></span>{' · '}<span>{t('stats.best')} <strong>{stats.bestStreak}</strong></span></p>

      <MenuDrawer>
        <section><h3 style={{ margin: '0 0 var(--s-2)', font: 'var(--t-caption-bold)' }}>{t('menu.howTo')}</h3><p style={{ margin: 0, font: 'var(--t-caption)', color: 'var(--text-near-white)' }}>{t('people.howTo')}</p></section>
        <PillRow
          label={facet.labels[lang]} value={field} onChange={setField}
          options={[{ value: null, label: t('picker.all'), count: catalogue.length }, ...options.map((option) => ({ value: option.value, label: option.labels[lang], hint: option.labels[lang === 'vi' ? 'en' : 'vi'], count: option.count }))]}
        />
        <StreakBar stats={stats} syncFailed={syncFailed} />
        <Leaderboard version={synced} topic="people" />
        <section className="memes-setting"><label htmlFor="memes-toggle" className="field-label">{t('menu.memes')}</label><input id="memes-toggle" type="checkbox" checked={memesEnabled} onChange={(event) => onMemes(event.target.checked)} /></section>
        <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="field-label">{t('app.language')}</span><LangToggle /></section>
      </MenuDrawer>
    </div>
  );
}
