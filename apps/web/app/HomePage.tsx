'use client';

import Link from 'next/link';
import { renderableTopicIds, topicMeta } from '@/lib/topics/meta';
import { useI18n } from './components/I18nProvider';
import { AccountBar } from './components/AccountBar';
import { SiteFooter } from './components/SiteFooter';

export function HomePage({ topicIds = renderableTopicIds }: { topicIds?: readonly (keyof typeof topicMeta)[] }) {
  const { t, lang } = useI18n();

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="wordmark">
          {t('app.name')}
        </p>
        <AccountBar />
      </header>
      <div className="home-layout">
        <section className="home-intro" aria-labelledby="home-title">
          <span className="edition-label">{t('home.title')}</span>
          <h1
            id="home-title"
            className={`poster-headline${lang === 'vi' ? ' poster-headline--vi' : ''}`}
          >
            <span>{t('home.headlineOne')}</span>
            <span className="headline-coral">{t('home.headlineTwo')}</span>
          </h1>
          <p className="poster-copy">{t('home.intro')}</p>
        </section>
        <ul className="topic-grid" aria-label={t('home.topics')}>
          {topicIds.map((id) => {
            const meta = topicMeta[id];
            return (
              <li key={id}>
                <Link className="topic-card" href={`/${id}`}>
                  <span className="topic-card__burst" aria-hidden="true">
                    {meta.burst[0]}
                    <br />
                    {meta.burst[1]}
                  </span>
                  <span className="card-ticket">{meta.clue[lang]}</span>
                  <h2 className="topic-card__name">{meta.name[lang]}</h2>
                  <p className="topic-card__blurb">{meta.blurb[lang]}</p>
                  <span className="pill pill--accent topic-card__cta">
                    {t('home.play')} <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <SiteFooter />
    </main>
  );
}
