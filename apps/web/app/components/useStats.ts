'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authApi, AuthError, type RoundReport } from '@/lib/auth/client';
import { EMPTY_STATS, recordResult, type Stats } from '@wts/core';
import { loadStats, saveStats } from '@/lib/storage/guest-stats';
import { useAuth } from './AuthProvider';

/**
 * Stats for whoever is playing.
 *
 * Guests: counted in the browser and kept in sessionStorage, so they last until
 * the tab closes. Signed-in players: every finished round goes to the server,
 * which owns the numbers; the local update is only there so the bar moves
 * immediately, and is replaced by the server's answer.
 */
export function useStats(topic?: string) {
  const { status, user, sessionLost } = useAuth();
  const userId = user?.id ?? null;
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [syncFailed, setSyncFailed] = useState(false);
  // Counts rounds the server has confirmed, so the leaderboard knows when to
  // refetch — after the round is stored, not when it is merely reported.
  const [synced, setSynced] = useState(0);
  const [topicPlayed, setTopicPlayed] = useState<number | null>(null);

  // Bumped on every identity change and every report, so a response that
  // arrives late — for a previous player, or overtaken by a newer round —
  // cannot overwrite fresher numbers.
  const seq = useRef(0);

  useEffect(() => {
    if (status === 'loading') return;
    const mine = ++seq.current;
    setSyncFailed(false);
    setTopicPlayed(null);
    if (userId === null) {
      setStats(loadStats());
      setTopicPlayed(0);
      return;
    }
    setStats(EMPTY_STATS);
    authApi
      .stats()
      .then((s) => {
        if (seq.current === mine) setStats(s);
      })
      .catch((err: unknown) => {
        if (seq.current !== mine) return;
        if (err instanceof AuthError && err.code === 'unauthenticated') sessionLost();
        else setSyncFailed(true);
      });
    authApi.stats({ topic }).then((s) => {
      if (seq.current === mine) setTopicPlayed(s.played);
    }).catch((err: unknown) => {
      if (seq.current !== mine) return;
      if (err instanceof AuthError && err.code === 'unauthenticated') sessionLost();
      else { setSyncFailed(true); setTopicPlayed(1); }
    });
  }, [status, userId, sessionLost, topic]);

  const record = useCallback(
    (report: RoundReport) => {
      const optimistic = recordResult(stats, report.won);
      setStats(optimistic);
      if (userId === null) {
        saveStats(optimistic);
        return;
      }
      const mine = ++seq.current;
      authApi
        .recordRound(report)
        .then((s) => {
          setSynced((n) => n + 1);
          if (seq.current !== mine) return;
          setStats(s);
          setSyncFailed(false);
        })
        .catch((err: unknown) => {
          if (seq.current !== mine) return;
          if (err instanceof AuthError && err.code === 'unauthenticated') sessionLost();
          else setSyncFailed(true);
        });
    },
    [stats, userId, sessionLost],
  );

  return { stats, record, syncFailed, synced, topicPlayed, guest: userId === null };
}
