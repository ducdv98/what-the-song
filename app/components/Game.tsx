'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clipUrl, indexCatalogue, playableSongs, type Song } from '@/lib/catalogue';
import { REVEAL_LADDER } from '@/lib/audio/engine';
import {
  createRound, giveUp, revealedSeconds, skip, submitGuess, type Round,
} from '@/lib/game/round';
import { useAudioEngine } from './useAudioEngine';
import { PlayButton, formatSeconds } from './PlayButton';
import { RevealLadder } from './RevealLadder';
import { Lives } from './Lives';
import { GuessInput } from './GuessInput';

/** Pick a song at random, avoiding an immediate repeat. */
function pickRandom(items: Song[], excludeId?: string): Song | undefined {
  const pool = excludeId ? items.filter((s) => s.id !== excludeId) : items;
  // With a one-song catalogue there is nothing else to pick.
  const from = pool.length > 0 ? pool : items;
  return from[Math.floor(Math.random() * from.length)];
}

export function Game({ catalogue }: { catalogue: Song[] }) {
  // A song with a gap in its clip ladder would throw mid-round, so drop it up
  // front rather than discovering it two reveals in.
  const [songs, skipped] = useMemo(
    () => playableSongs(catalogue, REVEAL_LADDER),
    [catalogue],
  );
  const index = useMemo(() => indexCatalogue(songs), [songs]);
  const { engine, state } = useAudioEngine();
  const [round, setRound] = useState<Round<Song> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRound = useCallback(
    (excludeId?: string) => {
      const song = pickRandom(songs, excludeId);
      if (!song) return;
      setError(null);
      engine.stop();
      setRound(createRound(song));
    },
    [songs, engine],
  );

  useEffect(() => {
    if (!round && songs.length > 0) startRound();
  }, [round, songs, startRound]);

  const seconds = round ? revealedSeconds(round) : REVEAL_LADDER[0];

  // Warm the next rung so revealing feels immediate.
  useEffect(() => {
    if (!round || round.status !== 'playing') return;
    const next = REVEAL_LADDER[round.stepIndex + 1];
    if (next === undefined) return;
    try {
      engine.prefetch(clipUrl(round.song, next));
    } catch {
      /* rung missing from this song's clips; play() will report it */
    }
  }, [round, engine]);

  const play = useCallback(async () => {
    if (!round) return;
    try {
      // This runs inside a click handler, which is what unlocks the
      // AudioContext on mobile Safari.
      await engine.play(clipUrl(round.song, seconds), seconds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not play that clip.');
    }
  }, [engine, round, seconds]);

  if (songs.length === 0) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <p style={{ font: 'var(--t-body-bold)', margin: '0 0 var(--s-2)' }}>
          No playable songs
        </p>
        <p style={{ font: 'var(--t-caption)', color: 'var(--text-muted)', margin: 0 }}>
          {skipped.length > 0
            ? `${skipped.length} song(s) have an incomplete clip ladder. Re-run
               tools/ingest.py — its report says which cuts failed.`
            : 'The catalogue is empty.'}
        </p>
      </div>
    );
  }

  if (!round) {
    return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>;
  }

  const over = round.status !== 'playing';
  const song = round.song;

  return (
    <div style={{ display: 'grid', gap: 'var(--s-6)', maxWidth: 560 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ font: 'var(--t-section-title)', margin: 0 }}>Đoán bài hát</h1>
        <Lives livesLeft={round.livesLeft} />
      </header>

      <div className="card card--elevated" style={{ display: 'grid', gap: 'var(--s-5)' }}>
        <PlayButton state={state} seconds={seconds} onPlay={play} disabled={over} />
        <RevealLadder stepIndex={round.stepIndex} />
      </div>

      {error && (
        <p role="alert" style={{ font: 'var(--t-caption)', color: 'var(--text-negative)', margin: 0 }}>
          {error}
        </p>
      )}

      {!over && (
        <>
          <GuessInput index={index} onGuess={(title) => setRound((r) => (r ? submitGuess(r, title) : r))} />
          <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
            <button className="pill" onClick={() => setRound((r) => (r ? skip(r) : r))}>
              Reveal more
            </button>
            <button className="pill pill--outlined pill--muted" onClick={() => setRound((r) => (r ? giveUp(r) : r))}>
              Give up
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
              {round.status === 'won' ? 'Chính xác' : 'Hết lượt'}
            </p>
            <p style={{ font: 'var(--t-body-bold)', margin: 0 }}>{song.title}</p>
            <p style={{ font: 'var(--t-caption)', color: 'var(--text-muted)', margin: 0 }}>
              {song.artist}
            </p>
          </div>

          <p style={{ font: 'var(--t-small)', color: 'var(--text-muted)', margin: 0 }}>
            {round.status === 'won'
              ? `${round.score} points — guessed at ${formatSeconds(seconds)}`
              : `Revealed up to ${formatSeconds(seconds)}`}
          </p>

          <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
            <button className="pill pill--accent" onClick={() => startRound(song.id)}>
              Next song
            </button>
            <button className="pill pill--outlined" onClick={play}>
              Replay clip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
