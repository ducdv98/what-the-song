'use client';

import Link from 'next/link';
import { InformationPage } from '../components/InformationPage';
import { useI18n } from '../components/I18nProvider';

const SECTIONS = [
  'license', 'commercial', 'rights', 'legalBasis', 'thirdParty', 'conduct', 'availability', 'changes', 'contact',
] as const;

const IP_LAW = 'https://congbao.cdnchinhphu.vn/180507251028987904/2026/4/10/469197-1775632354_v1_1775783230_signed.pdf';

export function TermsContent() {
  const { t } = useI18n();

  return (
    <InformationPage kind="terms">
      <aside className="terms-callout" aria-labelledby="terms-use-title">
        <h2 id="terms-use-title">{t('terms.notice.title')}</h2>
        <p>{t('terms.notice.body')}</p>
        <p>{t('terms.notice.status')}</p>
        <p className="terms-callout-source">
          {t('terms.notice.source')} <a href={`${IP_LAW}#page=18`} target="_blank" rel="noopener noreferrer">{t('terms.source.composition')}</a>{' · '}
          <a href={`${IP_LAW}#page=27`} target="_blank" rel="noopener noreferrer">{t('terms.source.recording')}</a>
        </p>
      </aside>
      <p className="terms-acceptance">{t('terms.acceptance')}</p>
      <div className="terms-sections">
        {SECTIONS.map((section, index) => (
          <section className="terms-section" key={section} aria-labelledby={`terms-${section}`}>
            <h2 id={`terms-${section}`}>
              <span className="info-number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              {t(`terms.${section}.title`)}
            </h2>
            <p>{t(`terms.${section}.body`)}</p>
            {section === 'legalBasis' && (
              <ul className="license-links">
                <li><a href={`${IP_LAW}#page=18`} target="_blank" rel="noopener noreferrer">{t('terms.source.composition')}</a> — {t('terms.law.composition')}</li>
                <li><a href={`${IP_LAW}#page=26`} target="_blank" rel="noopener noreferrer">{t('terms.source.performance')}</a> — {t('terms.law.performance')}</li>
                <li><a href={`${IP_LAW}#page=27`} target="_blank" rel="noopener noreferrer">{t('terms.source.recording')}</a> — {t('terms.law.recording')}</li>
                <li><a href={`${IP_LAW}#page=21`} target="_blank" rel="noopener noreferrer">{t('terms.source.workExceptions')}</a>{' · '}
                  <a href={`${IP_LAW}#page=29`} target="_blank" rel="noopener noreferrer">{t('terms.source.recordingExceptions')}</a> — {t('terms.law.exceptions')}</li>
                <li><a href={`${IP_LAW}#page=30`} target="_blank" rel="noopener noreferrer">{t('terms.source.royalties')}</a> — {t('terms.law.royalties')}</li>
              </ul>
            )}
            {section === 'thirdParty' && (
              <ul className="license-links">
                <li><a href="/fonts/anton-OFL.txt">Anton — SIL Open Font License 1.1</a></li>
                <li><a href="/fonts/bevietnampro-OFL.txt">Be Vietnam Pro — SIL Open Font License 1.1</a></li>
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="info-crosslink">
        {t('terms.faqPrompt')} <Link href="/faq">{t('faq.label')} →</Link>
      </p>
    </InformationPage>
  );
}
