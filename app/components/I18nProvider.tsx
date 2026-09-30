'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANG, detectFromBrowser, isLang, type Lang } from '@/lib/i18n/detect';
import { translate, type MessageKey } from '@/lib/i18n/messages';

type T = (key: MessageKey, params?: Record<string, string | number>) => string;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: T }>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (k) => translate(DEFAULT_LANG, k),
});

const KEY = 'what-the-song:lang:v1';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Starts at the default so the prerendered markup and the first client
  // render agree; detection runs after mount, where navigator exists.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      // Storage unavailable; fall through to detection.
    }
    // An explicit choice always beats detection.
    setLangState(isLang(stored) ? stored : detectFromBrowser());
  }, []);

  // Keep the document language in step, for screen readers and for the
  // hyphenation and font fallback the browser picks.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // Not worth surfacing; the choice still applies this session.
    }
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t: (k: MessageKey, p?: Record<string, string | number>) => translate(lang, k, p) }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
