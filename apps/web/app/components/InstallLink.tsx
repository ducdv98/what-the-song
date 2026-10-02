'use client';

import { useEffect, useState } from 'react';
import { getInstallPrompt, isIos, isStandalone, promptInstall } from '@/lib/pwa/install';
import { useI18n } from './I18nProvider';

/** Footer link that is always available, even after the install hint was dismissed. */
export function InstallLink() {
  const { t } = useI18n();
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIos());
  }, []);

  if (standalone) return null;
  return (
    <>
      <button
        type="button"
        className="footer-install"
        onClick={() => {
          if (getInstallPrompt()) void promptInstall();
          else setShowHelp(true);
        }}
      >
        {t('install.title')}
      </button>
      {showHelp && <p className="footer-install__help" role="status">{ios ? t('install.ios') : t('install.generic')}</p>}
    </>
  );
}
