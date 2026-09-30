'use client';

import { LANGUAGES } from '@/lib/i18n/detect';
import { useI18n } from './I18nProvider';

const NAMES: Record<string, string> = { vi: 'Tiếng Việt', en: 'English' };

/** Two pills. With only two languages a dropdown would be more work to use. */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t('app.language')} style={{ display: 'flex', gap: 'var(--s-1)' }}>
      {LANGUAGES.map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={l === lang}
          aria-label={NAMES[l]}
          onClick={() => setLang(l)}
          className={l === lang ? 'pill pill--accent' : 'pill pill--muted'}
          style={{ padding: '4px 10px', letterSpacing: '1px' }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
