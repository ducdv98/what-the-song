import type { WarmUpProgress } from '@wts/core';

const key = (topic: string) => `what-the-song:warm-up:${topic}:v1`;

export function loadWarmUp(topic: string): WarmUpProgress | null {
  try {
    const raw = localStorage.getItem(key(topic));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const p = value as Record<string, unknown>;
    if (typeof p.rounds !== 'number' || !Number.isInteger(p.rounds) || p.rounds < 0 ||
      typeof p.won !== 'boolean' || typeof p.warmUp !== 'boolean') return null;
    return { rounds: p.rounds, won: p.won, warmUp: p.warmUp };
  } catch {
    return null;
  }
}

export function saveWarmUp(topic: string, progress: WarmUpProgress): void {
  try {
    localStorage.setItem(key(topic), JSON.stringify(progress));
  } catch {
    // A blocked browser store must not prevent playing.
  }
}
