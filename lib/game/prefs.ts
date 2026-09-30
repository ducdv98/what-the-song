/**
 * Remembered picker choices.
 *
 * A per-viewer convenience, which is exactly what browser storage is for: it
 * never leaves this browser and losing it costs nothing. Anything that matters
 * (streaks) is in stats.ts, and even that is best-effort — see docs/RESEARCH.md
 * §10.5 on why a static export has no better option.
 */

const KEY = 'what-the-song:prefs:v1';

export interface Prefs {
  /** null means "all genres". */
  genre: string | null;
  difficulty: string;
}

export const DEFAULT_PREFS: Prefs = { genre: null, difficulty: 'normal' };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      genre: typeof p.genre === 'string' ? p.genre : null,
      difficulty:
        typeof p.difficulty === 'string' ? p.difficulty : DEFAULT_PREFS.difficulty,
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
