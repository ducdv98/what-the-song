'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from './I18nProvider';
import { InstallLink } from './InstallLink';
import { LangToggle } from './LangToggle';

export function SiteFooter() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <footer className="page-footer">
      <p>{t('app.footer')}</p>
      <nav className="footer-links" aria-label={t('info.navigation')}>
        <Link href="/faq" aria-current={pathname === '/faq' ? 'page' : undefined}>
          {t('faq.label')}
        </Link>
        <Link href="/terms" aria-current={pathname === '/terms' ? 'page' : undefined}>
          {t('terms.label')}
        </Link>
        <InstallLink />
      </nav>
      <LangToggle />
    </footer>
  );
}
