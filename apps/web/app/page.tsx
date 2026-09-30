'use client';

import { useEffect, useState } from 'react';
import type { Song } from '@wts/game';
import { Game } from './components/Game';
import { useI18n } from './components/I18nProvider';
import { AccountBar } from './components/AccountBar';
import { GuestNotice } from './components/GuestNotice';
import { MenuButton, MenuProvider } from './components/GameMenu';

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

  const playable = catalogue !== null && catalogue.length > 0;

  return (
    <MenuProvider>
      <main
        style={{
          minHeight: '100dvh',
          padding: 'var(--s-4) var(--s-4) var(--s-10)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--s-6)',
          // A soft spotlight from above, behind the game.
          background:
            'radial-gradient(ellipse 60% 45% at 50% 0%, rgba(30, 215, 96, 0.07), transparent 70%), var(--bg-base)',
        }}
      >
        <header
          style={{
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--s-3)',
          }}
        >
          {playable && <MenuButton />}
          <p
            style={{
              font: 'italic 800 20px/1 var(--font-ui)',
              letterSpacing: '-0.5px',
              color: 'var(--text-base)',
              margin: 0,
              marginRight: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            what the <span style={{ color: 'var(--accent)' }}>song</span>
          </p>
          {/* Outside <Game>, so signing in works even with no clip library. */}
          <AccountBar />
        </header>

        <div style={{ width: '100%', maxWidth: 480, display: 'grid' }}>
          <GuestNotice />
        </div>

        {error && (
          <div className="card" style={{ width: '100%', maxWidth: 480 }}>
            <p style={{ font: 'var(--t-body-bold)', margin: '0 0 var(--s-2)' }}>{t('empty.noLibrary')}</p>
            <p style={{ font: 'var(--t-caption)', color: 'var(--text-muted)', margin: 0 }}>
              {t('empty.buildFirst')}
              <br />
              <code style={{ color: 'var(--text-near-white)' }}>./tools/ingest.py seed.jsonl</code>
            </p>
            <p style={{ font: 'var(--t-small)', color: 'var(--text-muted)', margin: 'var(--s-3) 0 0' }}>{error}</p>
          </div>
        )}

        {playable && <Game catalogue={catalogue} />}
        {catalogue && catalogue.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('empty.catalogue')}</p>}
      </main>
    </MenuProvider>
  );
}
