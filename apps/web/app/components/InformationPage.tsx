'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { DEFAULT_TOPIC_ID } from '@wts/topics';
import { useI18n } from './I18nProvider';
import { SiteFooter } from './SiteFooter';

export function InformationPage({
  kind,
  children,
}: {
  kind: 'faq' | 'terms';
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <main className="app-shell info-shell">
      <header className="app-header">
        <Link className="wordmark wordmark-link" href={`/${DEFAULT_TOPIC_ID}`}>
          {t('app.name')}
        </Link>
        <Link className="pill pill--muted info-back" href={`/${DEFAULT_TOPIC_ID}`}>
          <span aria-hidden="true">←</span> {t('info.back')}
        </Link>
      </header>
      <div className="info-layout">
        <div className="info-intro">
          <span className="edition-label">{t('app.tagline')}</span>
          <h1 className="info-title">{t(`${kind}.title`)}</h1>
          <p className="info-description">{t(`${kind}.intro`)}</p>
          <p className="info-note">{t('info.personalUse')}</p>
        </div>
        <article className="info-paper" aria-label={t(`${kind}.label`)}>
          <div className="card-masthead">
            <strong>{t('app.name')}</strong>
            <span className="card-ticket">{t(`${kind}.label`)}</span>
          </div>
          {children}
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
