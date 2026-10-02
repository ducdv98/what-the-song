import { assetUrls } from './urls.ts';

export type MemeOutcome = 'won' | 'lost';

export interface Meme {
  file: string;
  outcome: MemeOutcome;
  source: string;
}

export interface ResolvedMeme {
  meme: Meme;
  url: string;
}

/** The result has no Meme while playing, when disabled, or after an image failure. */
export function visibleResultMeme(
  status: MemeOutcome | 'playing',
  memes: Record<MemeOutcome, ResolvedMeme | null> | undefined,
  resolvedUrl: string | null,
  imageFailed: boolean,
): ResolvedMeme | null {
  if (status === 'playing' || imageFailed) return null;
  const selected = memes?.[status];
  if (!selected) return null;
  const url = resolvedUrl ?? selected.url;
  return url ? { meme: selected.meme, url } : null;
}

const CATALOGUE = '/assets/memes/catalogue.json';
const MEME_FILE = /^(?:memes\/)?[a-f0-9]{24}\.(?:webp|jpg|png)$/;

function isMeme(value: unknown): value is Meme {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.file === 'string' && MEME_FILE.test(entry.file)
    && (entry.outcome === 'won' || entry.outcome === 'lost')
    && typeof entry.source === 'string' && entry.source.length > 0;
}

/** A global pool shared by all Topics; invalid or missing data yields no Meme. */
export class MemePool {
  private readonly assets: Pick<typeof assetUrls, 'fetch'>;
  private readonly random: () => number;
  private entries: Meme[] = [];
  private previous: Partial<Record<MemeOutcome, string>> = {};
  private lastShown: Partial<Record<MemeOutcome, string>> = {};
  private loading: Promise<void> | null = null;

  constructor(
    assets: Pick<typeof assetUrls, 'fetch'> = assetUrls,
    random: () => number = Math.random,
  ) {
    this.assets = assets;
    this.random = random;
  }

  load(): Promise<void> {
    this.loading ??= (async () => {
      try {
        const response = await this.assets.fetch(CATALOGUE, { cache: 'no-store' });
        if (!response.ok) throw new Error('Meme catalogue unavailable');
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isMeme)) {
          this.entries = [];
          return;
        }
        const seen = new Set<string>();
        this.entries = data.filter((entry: Meme) => {
          const key = `${entry.outcome}:${entry.file}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      } catch {
        this.entries = [];
        this.loading = null; // let the next Round retry
      }
    })();
    return this.loading;
  }

  pick(outcome: MemeOutcome): Meme | null {
    const entries = this.entries.filter((entry) => entry.outcome === outcome);
    const excluded = this.lastShown[outcome] ?? this.previous[outcome];
    const eligible = entries.length > 1
      ? entries.filter((entry) => entry.file !== excluded)
      : entries;
    if (eligible.length === 0) return null;
    const meme = eligible[Math.floor(this.random() * eligible.length)] ?? eligible[0];
    this.previous[outcome] = meme.file;
    return meme;
  }

  markShown(outcome: MemeOutcome, meme: Meme): void {
    this.lastShown[outcome] = meme.file;
  }
}

export const memePool = new MemePool();

export function memePath(meme: Meme): string {
  return `/assets/${meme.file.startsWith('memes/') ? meme.file : `memes/${meme.file}`}`;
}

/** A failed image gets one fresh signed URL, then disappears if that also fails. */
export async function retryMemeImage(
  meme: Meme,
  currentUrl: string,
  alreadyRetried: boolean,
  resolve: (path: string, force: boolean) => Promise<string> = (path, force) => assetUrls.resolve(path, force),
): Promise<string | null> {
  if (alreadyRetried) return null;
  try {
    const fresh = await resolve(memePath(meme), true);
    return fresh === currentUrl ? null : fresh;
  } catch {
    return null;
  }
}

/** Signs one image for each possible outcome in the Round's existing batch. */
export async function prepareRoundAssets(
  paths: string[],
  memesEnabled: boolean,
  prepare: (paths: string[]) => Promise<void> = (items) => assetUrls.prepare(items),
  pool: MemePool = memePool,
): Promise<Record<MemeOutcome, Meme | null>> {
  const selected = { won: null, lost: null } as Record<MemeOutcome, Meme | null>;
  if (memesEnabled) {
    await pool.load();
    selected.won = pool.pick('won');
    selected.lost = pool.pick('lost');
  }
  const batch = [
    ...paths,
    ...(selected.won ? [memePath(selected.won)] : []),
    ...(selected.lost ? [memePath(selected.lost)] : []),
  ];
  try {
    await prepare(batch);
  } catch (error) {
    if (batch.length === paths.length) throw error;
    await prepare(paths);
    return { won: null, lost: null };
  }
  return selected;
}
