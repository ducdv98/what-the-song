'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SONGS_ASSET_BASE, type Song } from '@wts/topic-songs';
import type { Dish } from '@wts/topic-food';
import { topics } from '@wts/topics';
import { renderers, type RenderableTopicId } from '@/lib/topics/renderers';
import { assetUrls } from '@/lib/assets/urls';
import { useI18n } from '../components/I18nProvider';
import { AccountBar } from '../components/AccountBar';
import { GuestNotice } from '../components/GuestNotice';
import { SiteFooter } from '../components/SiteFooter';
import { InstallHint } from '../components/InstallHint';
import { MenuButton, MenuProvider } from '../components/GameMenu';

/** Runtime catalogue keeps the static build independent of the clip library. */
export function TopicPage({ topicId }: { topicId: RenderableTopicId }) {
  const topic = topics[topicId];
  const food = topicId === 'food';
  const { t, lang } = useI18n();
  const [loaded, setLoaded] = useState<
    { topicId: 'songs'; catalogue: Song[] } | { topicId: 'food'; catalogue: Dish[] } | null
  >(null);
  const catalogue = loaded?.topicId === topicId ? loaded.catalogue : null;
  const [error, setError] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  useEffect(() => {
    // A cached shell can open offline, but Rounds need fresh catalogue and
    // clips. Show the dedicated explanation instead of a library error.
    if (!navigator.onLine) {
      window.location.replace('/offline.html');
      return;
    }
    setError(false);
    setLoaded(null);
    const controller = new AbortController();
    const assetBase = topicId === 'songs' ? SONGS_ASSET_BASE : `/assets/${topicId}`;
    assetUrls.fetch(`${assetBase}/catalogue.json`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Catalogue unavailable');
        return r.json();
      })
      .then((data: unknown) => {
        if (controller.signal.aborted) return;
        if (topicId === 'songs') setLoaded({ topicId, catalogue: topics.songs.validateCatalogue(data) });
        else setLoaded({ topicId, catalogue: topics.food.validateCatalogue(data) });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          if (!navigator.onLine) window.location.replace('/offline.html');
          else setError(true);
        }
      });
    return () => controller.abort();
  }, [reloadVersion, topic, topicId]);
  const playable = catalogue !== null && catalogue.length > 0;

  return (
    <MenuProvider>
      <main className="app-shell">
        <header className="app-header">
          {playable && <MenuButton />}
          <p className="wordmark">
            what the <span>{food ? 'food' : 'song'}</span>
            <span aria-hidden="true">?</span>
          </p>
          <span className="header-edition">{food ? t('food.appEdition') : t('app.edition')}</span>
          <Link className="pill pill--muted home-back" href="/">
            <span aria-hidden="true">←</span>&nbsp;{t('home.back')}
          </Link>
          <AccountBar />
        </header>
        <div className="poster-layout">
          <section className="poster-intro" aria-labelledby="poster-title">
            <span className="edition-label">{food ? t('food.appEdition') : t('app.edition')}</span>
            <h1
              id="poster-title"
              className={`poster-headline${lang === 'vi' ? ' poster-headline--vi' : ''}`}
            >
              <span>{food ? t('food.headlineOne') : t('app.headlineOne')}</span>
              <span className="headline-coral">{food ? t('food.headlineTwo') : t('app.headlineTwo')}</span>
            </h1>
            <p className="poster-copy">{food ? t('food.intro') : t('app.intro')}</p>
            <p className="poster-footnote">{food ? t('food.footnote') : t('app.footnote')}</p>
            <div className="poster-burst" aria-hidden="true">
              VIET
              <br />
              {food ? 'FOOD' : 'HITS'}
            </div>
          </section>
          <div className="game-column">
            {loaded?.topicId === 'songs' && topicId === 'songs' && loaded.catalogue.length > 0 &&
              <renderers.songs catalogue={loaded.catalogue} topicId="songs" />}
            {loaded?.topicId === 'food' && topicId === 'food' && loaded.catalogue.length > 0 &&
              <renderers.food catalogue={loaded.catalogue} topicId="food" />}
            {!playable && (
              <section
                className="state-card"
                aria-live="polite"
                aria-busy={catalogue === null && !error}
              >
                <div className="card-masthead">
                  <strong>{food ? 'WHAT THE FOOD?' : 'WHAT THE SONG?'}</strong>
                  <span className="card-ticket">{food ? t('food.appEdition') : t('app.editionShort')}</span>
                </div>
                <h2>
                  {error
                    ? food ? t('food.noLibrary') : t('empty.noLibrary')
                    : catalogue
                      ? t('empty.catalogue')
                      : t('loading')}
                </h2>
                <p>
                  {error || catalogue
                    ? t('empty.libraryHelp')
                    : food ? t('food.loadingBody') : t('loading.body')}
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
        <InstallHint />
        <SiteFooter />
      </main>
    </MenuProvider>
  );
}
