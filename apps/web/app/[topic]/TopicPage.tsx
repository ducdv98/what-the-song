'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SONGS_ASSET_BASE, type Song } from '@wts/topic-songs';
import type { Dish } from '@wts/topic-food';
import type { Person } from '@wts/topic-people';
import { topics } from '@wts/topics';
import { renderers, type RenderableTopicId } from '@/lib/topics/renderers';
import { topicMeta } from '@/lib/topics/meta';
import type { MessageKey } from '@/lib/i18n/messages';
import { assetUrls } from '@/lib/assets/urls';
import { useI18n } from '../components/I18nProvider';
import { AccountBar } from '../components/AccountBar';
import { GuestNotice } from '../components/GuestNotice';
import { SiteFooter } from '../components/SiteFooter';
import { InstallHint } from '../components/InstallHint';
import { MenuButton, MenuProvider } from '../components/GameMenu';

type Loaded =
  | { topicId: 'songs'; catalogue: Song[] }
  | { topicId: 'food'; catalogue: Dish[] }
  | { topicId: 'people'; catalogue: Person[] };

const loaders = {
  songs: (data: unknown): Loaded => ({ topicId: 'songs', catalogue: topics.songs.validateCatalogue(data) }),
  food: (data: unknown): Loaded => ({ topicId: 'food', catalogue: topics.food.validateCatalogue(data) }),
  people: (data: unknown): Loaded => ({ topicId: 'people', catalogue: topics.people.validateCatalogue(data) }),
};

const copy = {
  songs: { edition: 'app.edition', ticket: 'app.editionShort', headlineOne: 'app.headlineOne', headlineTwo: 'app.headlineTwo', intro: 'app.intro', footnote: 'app.footnote', loadingBody: 'loading.body', noLibrary: 'empty.noLibrary', masthead: 'WHAT THE SONG?' },
  food: { edition: 'food.appEdition', ticket: 'food.appEdition', headlineOne: 'food.headlineOne', headlineTwo: 'food.headlineTwo', intro: 'food.intro', footnote: 'food.footnote', loadingBody: 'food.loadingBody', noLibrary: 'food.noLibrary', masthead: 'WHAT THE FOOD?' },
  people: { edition: 'people.appEdition', ticket: 'people.appEdition', headlineOne: 'people.headlineOne', headlineTwo: 'people.headlineTwo', intro: 'people.intro', footnote: 'people.footnote', loadingBody: 'people.loadingBody', noLibrary: 'people.noLibrary', masthead: 'WHO IS THIS?' },
} as const satisfies Record<RenderableTopicId, Record<'edition' | 'ticket' | 'headlineOne' | 'headlineTwo' | 'intro' | 'footnote' | 'loadingBody' | 'noLibrary', MessageKey> & { masthead: string }>;

/** Runtime catalogue keeps the static build independent of the clip library. */
export function TopicPage({ topicId }: { topicId: RenderableTopicId }) {
  const pageCopy = copy[topicId];
  const { t, lang } = useI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
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
        setLoaded(loaders[topicId](data));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          if (!navigator.onLine) window.location.replace('/offline.html');
          else setError(true);
        }
      });
    return () => controller.abort();
  }, [reloadVersion, topicId]);
  const playable = catalogue !== null && catalogue.length > 0;

  return (
    <MenuProvider>
      <main className="app-shell">
        <header className="app-header">
          {playable && <MenuButton />}
          <p className="wordmark">
            {t('app.name')}
          </p>
          <span className="header-edition">{t(pageCopy.edition)}</span>
          <Link className="pill pill--muted home-back" href="/">
            <span aria-hidden="true">←</span>&nbsp;{t('home.back')}
          </Link>
          <AccountBar />
        </header>
        <div className="poster-layout">
          <section className="poster-intro" aria-labelledby="poster-title">
            <span className="edition-label">{t(pageCopy.edition)}</span>
            <h1
              id="poster-title"
              className={`poster-headline${lang === 'vi' ? ' poster-headline--vi' : ''}`}
            >
              <span>{t(pageCopy.headlineOne)}</span>
              <span className="headline-coral">{t(pageCopy.headlineTwo)}</span>
            </h1>
            <p className="poster-copy">{t(pageCopy.intro)}</p>
            <p className="poster-footnote">{t(pageCopy.footnote)}</p>
            <div className="poster-burst" aria-hidden="true">
              {topicMeta[topicId].burst[0]}
              <br />
              {topicMeta[topicId].burst[1]}
            </div>
          </section>
          <div className="game-column">
            {loaded?.topicId === 'songs' && topicId === 'songs' && loaded.catalogue.length > 0 &&
              <renderers.songs catalogue={loaded.catalogue} topicId="songs" />}
            {loaded?.topicId === 'food' && topicId === 'food' && loaded.catalogue.length > 0 &&
              <renderers.food catalogue={loaded.catalogue} topicId="food" />}
            {loaded?.topicId === 'people' && topicId === 'people' && loaded.catalogue.length > 0 &&
              <renderers.people catalogue={loaded.catalogue} topicId="people" />}
            {!playable && (
              <section
                className="state-card"
                aria-live="polite"
                aria-busy={catalogue === null && !error}
              >
                <div className="card-masthead">
                  <strong>{pageCopy.masthead}</strong>
                  <span className="card-ticket">{t(pageCopy.ticket)}</span>
                </div>
                <h2>
                  {error
                    ? t(pageCopy.noLibrary)
                    : catalogue
                      ? t('empty.catalogue')
                      : t('loading')}
                </h2>
                <p>
                  {error || catalogue
                    ? t('empty.libraryHelp')
                    : t(pageCopy.loadingBody)}
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
