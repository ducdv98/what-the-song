/**
 * A guest's stats, in the browser tab.
 *
 * A thin adapter around the pure reducer in @wts/core. Storage is the part
 * that fails in interesting ways (private windows, blocked site data,
 * thumbnail capture), so it is kept apart from the counting.
 */

import { coerceStats, EMPTY_STATS, type Stats } from '@wts/core';

/**
 * Guests keep their stats in sessionStorage: they survive a reload but end with
 * the tab, which is the deal a guest gets — play freely, keep nothing. Signed-in
 * players' stats live on the server instead (apps/api) and are never
 * written here.
 */
const STORAGE_KEY = 'what-the-song:guest-stats:v1';

/**
 * Before accounts existed, stats persisted forever in localStorage. Guests no
 * longer get that, so the old key is removed rather than left orphaned.
 */
const LEGACY_KEY = 'what-the-song:stats:v1';

/**
 * Read a guest's stats.
 *
 * Every access is guarded: in a private window, with site data blocked, or
 * during a thumbnail capture, the accessor itself can throw. Returning empty
 * stats keeps the game playable — a lost streak is a far better outcome than a
 * blank page.
 */
export function loadStats(): Stats {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Nothing to clean up, or no storage at all.
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? coerceStats(JSON.parse(raw)) : EMPTY_STATS;
  } catch {
    return EMPTY_STATS;
  }
}

export function saveStats(stats: Stats): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage unavailable or full. Counting still works for this session.
  }
}

export function clearStats(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
