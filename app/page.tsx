'use client';

import { useEffect, useState } from 'react';
import type { Song } from '@/lib/catalogue';
import { Game } from './components/Game';
import { useI18n } from './components/I18nProvider';
import { AccountBar } from './components/AccountBar';

/**
 * The catalogue is fetched at runtime rather than imported, because
 * tools/ingest.py writes it alongside the clips and neither is committed.
 * That keeps the build independent of whatever is in the clip library.
 */
export default function Page() {
  const { t } = useI18n();
  const [catalogue, setCatalogue] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/clips/catalogue.json')
      .then((r) => {
        if (!r.ok) throw new Error(`catalogue.json returned ${r.status}`);
        return r.json();
      })
      .then((data: Song[]) => setCatalogue(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : t('empty.noLibrary')),
      );
  }, []);

  return (
    <main
      style={{
        minHeight: '100dvh',
        padding: 'var(--s-6) var(--s-4) var(--s-10)',
        display: 'grid',
        justifyContent: 'center',
        // Centre the column when it fits, fall back to top-aligned when it
        // does not, so a short viewport still scrolls normally.
        alignContent: 'safe center',
        gap: 'var(--s-5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--s-3)',
          flexWrap: 'wrap',
          maxWidth: 560,
        }}
      >
        <p
          style={{
            font: 'var(--t-caption-bold)',
            letterSpacing: '1.4px',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            margin: 0,
          }}
        >
          what the song
        </p>
        {/* Outside <Game>, so signing in works even with no clip library. */}
        <AccountBar />
      </div>

      {error && (
        <div className="card" style={{ maxWidth: 560 }}>
          <p style={{ font: 'var(--t-body-bold)', margin: '0 0 var(--s-2)' }}>
            {t('empty.noLibrary')}
          </p>
          <p style={{ font: 'var(--t-caption)', color: 'var(--text-muted)', margin: 0 }}>
            {t('empty.buildFirst')}
            <br />
            <code style={{ color: 'var(--text-near-white)' }}>
              ./tools/ingest.py seed.jsonl --out public/clips
            </code>
          </p>
          <p style={{ font: 'var(--t-small)', color: 'var(--text-muted)', margin: 'var(--s-3) 0 0' }}>
            {error}
          </p>
        </div>
      )}

      {catalogue && catalogue.length > 0 && <Game catalogue={catalogue} />}
      {catalogue && catalogue.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>{t('empty.catalogue')}</p>
      )}
    </main>
  );
}
