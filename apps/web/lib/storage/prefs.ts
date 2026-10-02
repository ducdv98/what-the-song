/**
 * Remembered picker choices.
 *
 * A per-viewer convenience, which is exactly what browser storage is for: it
 * never leaves this browser and losing it costs nothing. Streaks are kept
 * elsewhere: for a guest in guest-stats.ts (this tab only), for a signed-in
 * player on the server (apps/api).
 */

import { isTier, type TierSlug } from '@wts/core';

const KEY = 'what-the-song:prefs:v1';
const INSTALL_HINT_KEY = 'what-the-song:install-hint-dismissed:v1';

export function isInstallHintDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_HINT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function dismissInstallHint(): void {
  try {
    localStorage.setItem(INSTALL_HINT_KEY, 'true');
  } catch {
    // The hint still closes for this view when storage is unavailable.
  }
}

export interface Prefs {
  /** null means "all genres". */
  genre: string | null;
  /**
   * null means "pick for me": the first tier that has songs. Also what an
   * older build's saved difficulty ("normal", …) reads back as.
   */
  tier: TierSlug | null;
  memes: boolean;
}

export const DEFAULT_PREFS: Prefs = { genre: null, tier: null, memes: true };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      genre: typeof p.genre === 'string' ? p.genre : null,
      tier: isTier(p.tier) ? p.tier : null,
      memes: typeof p.memes === 'boolean' ? p.memes : true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Not important enough to surface.
  }
}
