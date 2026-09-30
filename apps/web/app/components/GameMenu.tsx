'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useI18n } from './I18nProvider';

/**
 * Settings and stats live in a drawer, not on the round screen — they are
 * touched once a session, and the round screen should hold nothing but the
 * game. The button sits in the page header; the drawer's contents come from
 * the game, which owns the settings. This context connects the two.
 */
const MenuCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MenuCtx.Provider value={{ open, setOpen }}>{children}</MenuCtx.Provider>;
}

export function MenuButton() {
  const { t } = useI18n();
  const { setOpen } = useContext(MenuCtx);
  return (
    <button className="icon-btn" aria-label={t('menu.open')} onClick={() => setOpen(true)}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** The drawer itself: a native modal <dialog>, so focus trap and Escape come free. */
export function MenuDrawer({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { open, setOpen } = useContext(MenuCtx);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="menu-title"
      onClose={() => setOpen(false)}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="drawer-header">
        <h2 id="menu-title" style={{ margin: 0, font: 'var(--t-feature)' }}>
          {t('menu.title')}
        </h2>
        <button className="icon-btn" aria-label={t('menu.close')} onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
      <div className="drawer-content">{children}</div>
    </dialog>
  );
}
