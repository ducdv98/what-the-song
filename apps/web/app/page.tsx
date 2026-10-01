'use client';

import { useEffect, useState } from 'react';
import { SONGS_ASSET_BASE, type Song } from '@wts/topic-songs';
import { DEFAULT_TOPIC_ID, getTopic } from '@wts/topics';
import { renderers } from '@/lib/topics/renderers';
import { useI18n } from './components/I18nProvider';
import { AccountBar } from './components/AccountBar';
import { GuestNotice } from './components/GuestNotice';
import { SiteFooter } from './components/SiteFooter';
import { MenuButton, MenuProvider } from './components/GameMenu';

/** Runtime catalogue keeps the static build independent of the clip library. */
export default function Page() {
  const topicId = DEFAULT_TOPIC_ID;
  const topic = getTopic(topicId);
  if (!topic) throw new Error('Songs Topic is not registered');
  const Renderer = renderers[topicId];
  const { t, lang } = useI18n();
  const [catalogue, setCatalogue] = useState<Song[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  useEffect(() => {
    setError(false);
    setCatalogue(null);
    const controller = new AbortController();
    fetch(`${SONGS_ASSET_BASE}/catalogue.json`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Catalogue unavailable');
        return r.json();
      })
      .then((data: unknown) => {
        setCatalogue(topic.validateCatalogue(data));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [reloadVersion]);
  const playable = catalogue !== null && catalogue.length > 0;

  return (
    <MenuProvider>
      <main className="app-shell">
        <header className="app-header">
          {playable && <MenuButton />}
          <p className="wordmark">
            what the <span>song</span>
            <span aria-hidden="true">?</span>
          </p>
          <span className="header-edition">{t('app.edition')}</span>
          <AccountBar />
        </header>
        <div className="poster-layout">
          <section className="poster-intro" aria-labelledby="poster-title">
            <span className="edition-label">{t('app.edition')}</span>
            <h1
              id="poster-title"
              className={`poster-headline${lang === 'vi' ? ' poster-headline--vi' : ''}`}
            >
              <span>{t('app.headlineOne')}</span>
              <span className="headline-coral">{t('app.headlineTwo')}</span>
            </h1>
            <p className="poster-copy">{t('app.intro')}</p>
            <p className="poster-footnote">{t('app.footnote')}</p>
            <div className="poster-burst" aria-hidden="true">
              VIET
              <br />
              HITS
            </div>
          </section>
          <div className="game-column">
            {playable && <Renderer catalogue={catalogue} />}
            {!playable && (
              <section
                className="state-card"
                aria-live="polite"
                aria-busy={catalogue === null && !error}
              >
                <div className="card-masthead">
                  <strong>WHAT THE SONG?</strong>
                  <span className="card-ticket">{t('app.editionShort')}</span>
                </div>
                <h2>
                  {error
                    ? t('empty.noLibrary')
                    : catalogue
                      ? t('empty.catalogue')
                      : t('loading')}
                </h2>
                <p>
                  {error || catalogue
                    ? t('empty.libraryHelp')
                    : t('loading.body')}
                </p>
                {(error || catalogue) && (
                  <button
                    className="pill pill--accent"
                    onClick={() => setReloadVersion((version) => version + 1)}
                  >
                    {t('empty.retry')}
                  </button>
                )}
              </section>
            )}
            <GuestNotice />
          </div>
        </div>
        <SiteFooter />
      </main>
    </MenuProvider>
  );
}
