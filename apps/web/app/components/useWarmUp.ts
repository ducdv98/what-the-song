'use client';

import { useCallback, useEffect, useState } from 'react';
import { finishWarmUp, warmUpEligible, type WarmUpProgress } from '@wts/core';
import { loadWarmUp, saveWarmUp } from '@/lib/storage/warm-up';

export function useWarmUp(topic: string, savedTier: string | null, topicPlayed: number | null, guest: boolean) {
  const [progress, setProgress] = useState<WarmUpProgress | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (topicPlayed == null) { setReady(false); return; }
    setProgress(guest ? loadWarmUp(topic) : null);
    setReady(true);
  }, [topic, topicPlayed, guest]);

  const active = ready && topicPlayed != null && warmUpEligible(savedTier, topicPlayed, progress);
  const finish = useCallback((won: boolean, wasWarmUp: boolean) => {
    const next = wasWarmUp
      ? finishWarmUp(progress ?? { rounds: 0, won: false, warmUp: true }, won)
      : { rounds: 1, won, warmUp: false };
    setProgress(next);
    if (guest) saveWarmUp(topic, next);
  }, [progress, guest, topic]);

  return { active, ready, finish };
}
