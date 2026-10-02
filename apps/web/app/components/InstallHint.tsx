'use client';

import { useEffect, useState } from 'react';
import {
  getInstallPrompt,
  isIos,
  isStandalone,
  promptInstall,
  subscribeInstallPrompt,
} from '@/lib/pwa/install';
import { dismissInstallHint, isInstallHintDismissed } from '@/lib/storage/prefs';
import { useI18n } from './I18nProvider';

export function InstallHint() {
  const { t } = useI18n();
  const [canPrompt, setCanPrompt] = useState(false);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(isStandalone() || isInstallHintDismissed());
    setIos(isIos());
    setCanPrompt(getInstallPrompt() !== null);
    const unsubscribe = subscribeInstallPrompt(() => setCanPrompt(getInstallPrompt() !== null));
    const onInstalled = () => setHidden(true);
    const onDisplayMode = () => setHidden(isStandalone() || isInstallHintDismissed());
    const displayMode = window.matchMedia('(display-mode: standalone)');
    window.addEventListener('appinstalled', onInstalled);
    displayMode.addEventListener('change', onDisplayMode);
    return () => {
      unsubscribe();
      window.removeEventListener('appinstalled', onInstalled);
      displayMode.removeEventListener('change', onDisplayMode);
    };
  }, []);

  if (hidden) return null;
  return (
    <aside className="install-hint" aria-label={t('install.title')}>
      <p>{canPrompt ? t('install.prompt') : ios ? t('install.ios') : t('install.generic')}</p>
      {canPrompt && <button className="pill pill--accent" onClick={() => {
        void promptInstall().then((accepted) => { if (accepted) setHidden(true); });
      }}>{t('install.button')}</button>}
      <button className="install-hint__dismiss" aria-label={t('install.dismiss')} onClick={() => {
        dismissInstallHint();
        setHidden(true);
      }}>✕</button>
    </aside>
  );
}
