'use client';

import { useEffect, useState } from 'react';
import { dismissInstallHint, isInstallHintDismissed } from '@/lib/storage/prefs';
import { useI18n } from './I18nProvider';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export function InstallHint() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(isStandalone() || isInstallHintDismissed());
    setIos(isIosSafari());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    const onDisplayMode = () => setHidden(isStandalone() || isInstallHintDismissed());
    const displayMode = window.matchMedia('(display-mode: standalone)');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    displayMode.addEventListener('change', onDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      displayMode.removeEventListener('change', onDisplayMode);
    };
  }, []);

  if (hidden || (!prompt && !ios)) return null;
  return (
    <aside className="install-hint" aria-label={t('install.title')}>
      <p>{prompt ? t('install.prompt') : t('install.ios')}</p>
      {prompt && <button className="pill pill--accent" onClick={() => {
        void prompt.prompt().then(() => prompt.userChoice).then((choice) => {
          if (choice.outcome === 'accepted') setHidden(true);
          setPrompt(null);
        }).catch(() => setPrompt(null));
      }}>{t('install.button')}</button>}
      <button className="install-hint__dismiss" aria-label={t('install.dismiss')} onClick={() => {
        dismissInstallHint();
        setHidden(true);
      }}>✕</button>
    </aside>
  );
}
