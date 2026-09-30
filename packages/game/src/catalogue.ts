/**
 * Catalogue loading and autocomplete search.
 *
 * Guessing is autocomplete-constrained (docs/RESEARCH.md §3.2): the player
 * picks a real catalogue entry, so scoring is an ID comparison rather than a
 * fuzzy match. That leaves this module doing search *ranking*, where being
 * slightly wrong is survivable.
 */

import { looseKey, toneKey } from './vietnamese.ts';

export interface Song {
  id: string;
  title: string;
  artist: string;
  aliases?: string[];
  genre?: string | null;
  /** How well known the song is — see difficulty.ts. Absent means medium. */
  tier?: string | null;
  /** Cover image filename in the song's clip folder, when ingest saved one. */
  cover?: string | null;
  /** Reveal-step index → clip filename, from tools/ingest.py. */
  clips: Record<string, string>;
}

/** A catalogue entry with its search keys precomputed. */
export interface IndexedSong extends Song {
  /** Diacritic-free haystacks: title, artist, aliases, and title+artist. */
  keys: string[];
}

/**
 * Precompute keys once. Normalising per keystroke over a few hundred songs
 * would be wasteful, and this runs on every input event.
 */
export function indexCatalogue(songs: Song[]): IndexedSong[] {
  return songs.map((song) => {
    const parts = [song.title, song.artist, ...(song.aliases ?? [])];
    const keys = new Set<string>();
    for (const p of parts) {
      const k = looseKey(p);
      if (k) keys.add(k);
    }
    // Let "son tung noi nay" match across the title/artist boundary.
    const combined = looseKey(`${song.title} ${song.artist}`);
    if (combined) keys.add(combined);
    return { ...song, keys: [...keys] };
  });
}

/** Higher is better. 0 means no match. */
function scoreMatch(key: string, q: string): number {
  if (key === q) return 100;
  if (key.startsWith(q)) return 80;
  // Word-boundary hit reads as more relevant than a mid-word one.
  if (key.includes(` ${q}`)) return 60;
  if (key.includes(q)) return 40;
  return 0;
}

/**
 * Rank the catalogue against a partial query.
 *
 * Matching is on the diacritic-free key, so a player typing "em cua ngay"
 * with no tone marks gets the right suggestions. Ties break on title length —
 * shorter titles are more likely to be what a short query meant.
 */
export function searchCatalogue(
  query: string,
  index: IndexedSong[],
  limit = 8,
): IndexedSong[] {
  const q = looseKey(query);
  if (!q) return [];

  const scored: { song: IndexedSong; score: number }[] = [];
  for (const song of index) {
    let best = 0;
    for (const key of song.keys) {
      const s = scoreMatch(key, q);
      if (s > best) best = s;
    }
    if (best > 0) scored.push({ song, score: best });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.song.title.length - b.song.title.length,
  );
  return scored.slice(0, limit).map((s) => s.song);
}

/**
 * Whether the player's typed text already spells the song correctly, tones and
 * all. Used only to congratulate accurate spelling — never to gate a win.
 */
export function isExactSpelling(text: string, song: Song): boolean {
  return toneKey(text) === toneKey(song.title);
}

/**
 * Manifest key for a reveal rung, as integer milliseconds.
 *
 * Must not be String(seconds): JavaScript renders 1.0 as "1" while Python's
 * str(1.0) is "1.0", so whole-second rungs would never be found. Milliseconds
 * are integers in both languages. clip_key() in tools/ingest.py is the other
 * half of this — change one and you must change both.
 */
export function clipKey(seconds: number): string {
  return String(Math.round(seconds * 1000));
}

/** Clip URL for a reveal step. Filenames are opaque hashes by design. */
export function clipUrl(song: Song, seconds: number, base = '/clips'): string {
  const name = song.clips[clipKey(seconds)];
  if (!name) throw new Error(`no clip for ${song.id} at ${seconds}s`);
  return `${base}/${song.id}/${name}`;
}

/** Cover image URL, or null when the song has none. */
export function coverUrl(song: Song, base = '/clips'): string | null {
  // Only a bare filename is trusted: the catalogue is data, not a path.
  return song.cover && /^[\w.-]+$/.test(song.cover) ? `${base}/${song.id}/${song.cover}` : null;
}

/**
 * The reveal ladder for one song, in seconds, ascending.
 *
 * Derived from the clip manifest rather than a shared constant, so ingest is
 * free to give each song its own ladder — a track with a long generic intro can
 * start at 2s while a distinctive one starts at 0.1s. It also means there is
 * only one source of truth: whatever clips exist are the rungs.
 */
export function ladderFor(song: Song): number[] {
  return Object.keys(song.clips ?? {})
    .map((k) => Number(k) / 1000)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

/**
 * Split out songs that cannot be played: no clips, or a manifest whose keys do
 * not parse. A song with *some* rungs is fine — its ladder is simply shorter.
 *
 * Returns [playable, skipped] so the caller can say what it dropped.
 */
export function playableSongs(songs: Song[]): [Song[], Song[]] {
  const playable: Song[] = [];
  const skipped: Song[] = [];
  for (const song of songs) {
    (ladderFor(song).length > 0 ? playable : skipped).push(song);
  }
  return [playable, skipped];
}
