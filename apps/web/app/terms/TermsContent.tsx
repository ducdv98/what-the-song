'use client';

import Link from 'next/link';
import { InformationPage } from '../components/InformationPage';
import { useI18n } from '../components/I18nProvider';

const SECTIONS = [
  'license', 'commercial', 'rights', 'thirdParty', 'conduct', 'availability', 'changes', 'contact',
] as const;

export function TermsContent() {
  const { t } = useI18n();

  return (
    <InformationPage kind="terms">
      <aside className="terms-callout" aria-labelledby="terms-use-title">
        <h2 id="terms-use-title">{t('terms.notice.title')}</h2>
        <p>{t('terms.notice.body')}</p>
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
