/**
 * Catalogue shape and clip lookups. Guesses are free text judged by matching.ts.
 */

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
  /** Reveal-step index → clip filename, from tools/ingest.py. Unusable manifests are skipped. */
  clips?: unknown;
}

/** Default clip lengths and selection targets, mirrored by tools/ingest.py. */
export const STAGE_TARGETS = [0.1, 0.5, 2, 8, 16] as const;

function isClipManifest(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.values(value).every((name) => typeof name === 'string');
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
  const name = isClipManifest(song.clips) ? song.clips[clipKey(seconds)] : undefined;
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
  if (!isClipManifest(song.clips)) return [];
  const rungs = [...new Set(Object.keys(song.clips)
    .map((k) => Number(k) / 1000)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b))];
  if (rungs.length <= STAGE_TARGETS.length) return rungs;

  const picked: number[] = [];
  let from = 0;
  STAGE_TARGETS.forEach((target, i) => {
    const isLast = i === STAGE_TARGETS.length - 1;
    const to = rungs.length - (STAGE_TARGETS.length - 1 - i);
    let best = isLast ? rungs.length - 1 : from;
    if (!isLast) {
      for (let j = from; j < to; j++) {
        if (Math.abs(Math.log(rungs[j] / target)) < Math.abs(Math.log(rungs[best] / target))) best = j;
      }
    }
    picked.push(rungs[best]);
    from = best + 1;
  });
  return picked;
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
