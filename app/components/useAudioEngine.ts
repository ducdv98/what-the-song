'use client';

import { useEffect, useRef, useState } from 'react';
import { AudioEngine, type PlaybackState } from '@/lib/audio/engine';

/**
 * One AudioEngine per mounted game, created lazily.
 *
 * The context is deliberately not created on mount: mobile Safari starts
 * contexts suspended unless they originate in a user gesture, so construction
 * waits for the first real click (engine.unlock, called from play()).
 */
export function useAudioEngine(): {
  engine: AudioEngine;
  state: PlaybackState;
} {
  const ref = useRef<AudioEngine | null>(null);
  ref.current ??= new AudioEngine();
  const engine = ref.current;

  const [state, setState] = useState<PlaybackState>('idle');

  useEffect(() => {
    const unsubscribe = engine.subscribe(setState);
    return () => {
      unsubscribe();
      engine.dispose();
    };
  }, [engine]);

  return { engine, state };
}
