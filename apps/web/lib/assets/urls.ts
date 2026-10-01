/** Browser side of the asset URL seam. The API selects Caddy or COS. */
export class AssetUrlClient {
  private readonly cache = new Map<
    string,
    { url: string; expiresAt: number | null }
  >();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly generation = new Map<string, number>();

  private key(path: string): string {
    if (!path.startsWith('/assets/'))
      throw new Error(`invalid asset path: ${path}`);
    return path.slice('/assets/'.length);
  }

  async prepare(paths: string[], force = false): Promise<void> {
    const keys = [...new Set(paths.map((path) => this.key(path)))];
    const missing = keys.filter((key) => force || !this.fresh(key));
    if (missing.length === 0) return;
    const pending = force
      ? []
      : missing
          .map((key) => this.pending.get(key))
          .filter((task): task is Promise<void> => task !== undefined);
    const toFetch = missing.filter((key) => force || !this.pending.has(key));
    if (toFetch.length > 0) {
      const generations = new Map(
        toFetch.map((key) => {
          const next = (this.generation.get(key) ?? 0) + 1;
          this.generation.set(key, next);
          return [key, next] as const;
        }),
      );
      const task = (async () => {
        const res = await fetch('/api/assets/urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: toFetch }),
        });
        if (!res.ok)
          throw new Error(`asset URL request failed (${res.status})`);
        const data = (await res.json()) as {
          urls: Record<string, string>;
          expiresAt: Record<string, number | null>;
        };
        for (const key of toFetch) {
          if (!data.urls[key]) throw new Error(`missing asset URL: ${key}`);
          if (this.generation.get(key) === generations.get(key)) {
            this.cache.set(key, {
              url: data.urls[key],
              expiresAt: data.expiresAt[key] ?? null,
            });
          }
        }
      })();
      for (const key of toFetch) this.pending.set(key, task);
      pending.push(task);
      void task
        .finally(() => {
          for (const key of toFetch) {
            if (this.pending.get(key) === task) this.pending.delete(key);
          }
        })
        .catch(() => {});
    }
    await Promise.all(pending);
  }

  private fresh(key: string): boolean {
    const value = this.cache.get(key);
    return (
      !!value &&
      (value.expiresAt === null || value.expiresAt > Date.now() + 30_000)
    );
  }

  async resolve(path: string, force = false): Promise<string> {
    await this.prepare([path], force);
    return this.cache.get(this.key(path))!.url;
  }

  /** Retry once when COS rejects a URL that expired in transit. */
  async fetch(path: string, init?: RequestInit): Promise<Response> {
    let res = await fetch(await this.resolve(path), init);
    if (
      res.status === 403 &&
      this.cache.get(this.key(path))?.expiresAt !== null
    ) {
      res = await fetch(await this.resolve(path, true), init);
    }
    return res;
  }
}

export const assetUrls = new AssetUrlClient();
