'use client';

import { useEffect, useRef, useState } from 'react';
import { tierOf, type Round } from '@wts/core';
import { selectCelebration, type BigEffect, type ResultContext } from '@/lib/celebration';
import type { Song } from '@wts/topic-songs';
import type { Dish, Zoom } from '@wts/topic-food';
import type { Person, Reveal } from '@wts/topic-people';
import type { PlaybackState } from '@/lib/audio/engine';
import { retryMemeImage, visibleResultMeme, type MemeOutcome, type ResolvedMeme } from '@/lib/assets/memes';
import { pickMemeCaption } from '@/lib/i18n/meme-captions';
import { useI18n } from './I18nProvider';
import { ResultCard } from './ResultCard';

let previousBigEffect: BigEffect | null = null;

/** One instance per finished Round. Unmounting on Next resets dismissal and retry state. */
export function ResultView({ round, memes, resultContext, nextWarmUp = false, ...cardProps }: {
  round: Round<Song, number> | Round<Dish, Zoom> | Round<Person, Reveal>;
  memes?: Record<MemeOutcome, ResolvedMeme | null>;
  resultContext?: ResultContext;
  nextWarmUp?: boolean;
  playback?: PlaybackState;
  onListen?: () => void;
  onNext: () => void;
  foodPhotoUrl?: string | null;
  peoplePhotoUrl?: string | null;
}) {
  const { t } = useI18n();
  const [celebration] = useState(() => round.status === 'won' ? selectCelebration({
    topic: 'title' in round.subject ? 'songs' : 'credit' in round.subject ? 'food' : 'people',
    stageIndex: round.stageIndex,
    tier: tierOf(round.subject),
    streak: resultContext?.streak ?? 1,
    firstWarmUpWin: resultContext?.firstWarmUpWin ?? false,
  }, previousBigEffect, Math.random()) : null);
  useEffect(() => { if (celebration) previousBigEffect = celebration.primary; }, [celebration]);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);
  const [caption] = useState(() => pickMemeCaption(round.status === 'won' ? 'won' : 'lost'));
  const visible = visibleResultMeme(round.status, memes, resolvedUrl, failed);
  const open = Boolean(visible && loadedUrl === visible.url && !dismissed);

  useEffect(() => {
    if (!visible || dismissed || loadedUrl === visible.url) return;
    let active = true;
    const image = new Image();
    image.onload = () => { if (active) setLoadedUrl(visible.url); };
    image.onerror = () => {
      if (!active) return;
      void retryMemeImage(visible.meme, visible.url, retried).then((url) => {
        if (!active) return;
        if (url) {
          setRetried(true);
          setResolvedUrl(url);
        } else setFailed(true);
      });
    };
    image.src = visible.url;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [visible?.url, visible?.meme, dismissed, loadedUrl, retried]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      closeButton.current?.focus();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  function dismiss() {
    setDismissed(true);
    if (dialog.current?.open) dialog.current.close();
    nextButton.current?.focus();
  }

  return <>
    <ResultCard round={round} {...cardProps} resultContext={resultContext} nextWarmUp={nextWarmUp} celebration={celebration} nextButtonRef={nextButton} autoFocusNext={!open} />
    <dialog
      ref={dialog}
      className="dialog meme-dialog"
      aria-label={t('result.meme')}
      onClose={dismiss}
      onCancel={dismiss}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
      }}
      onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}
    >
      <div className="dialog-header">
        <strong>{caption}</strong>
        <button ref={closeButton} className="icon-btn" type="button" aria-label={t('menu.close')} onClick={dismiss}>✕</button>
      </div>
      {open && visible && <img
        className="result-meme"
        src={visible.url}
        alt=""
        width={320}
        height={180}
        onError={() => {
          setRetried(true);
          void retryMemeImage(visible.meme, visible.url, retried).then((url) => {
            if (url) setResolvedUrl(url);
            else { setFailed(true); dismiss(); }
          });
        }}
      />}
    </dialog>
  </>;
}
