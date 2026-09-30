'use client';

import Link from 'next/link';
import { InformationPage } from '../components/InformationPage';
import { useI18n } from '../components/I18nProvider';

const QUESTIONS = [
  'play', 'score', 'account', 'leaderboard', 'settings', 'audio', 'commercial', 'music',
] as const;

export function FaqContent() {
  const { t } = useI18n();

  return (
    <InformationPage kind="faq">
      <div className="faq-list">
        {QUESTIONS.map((question, index) => (
          <details className="faq-item" key={question} open={index === 0}>
            <summary>
              <span className="info-number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{t(`faq.${question}.question`)}</span>
              <span className="faq-indicator" aria-hidden="true" />
            </summary>
            <p>{t(`faq.${question}.answer`)}</p>
          </details>
        ))}
      </div>
      <p className="info-crosslink">
        {t('faq.termsPrompt')} <Link href="/terms">{t('terms.label')} →</Link>
      </p>
    </InformationPage>
  );
}
