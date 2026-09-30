'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useI18n } from './I18nProvider';

const DISMISS_KEY = 'what-the-song:guest-notice-dismissed:v1';

/**
 * Tells a guest, up front, what the deal is: play freely with no account, but
 * nothing is kept — and offers the two ways to change that, right there.
 *
 * "Not now" hides it for the rest of this tab session only; the header's
 * Sign in / Register stay visible either way.
 */
export function GuestNotice() {
  const { t } = useI18n();
  const { status, available, openDialog } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  // Read after mount: sessionStorage does not exist during the static prerender,
  // and starting hidden avoids a flash for a player who already dismissed it.
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (status !== 'guest' || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Hidden for this page view regardless.
    }
  }

  return (
    <section
      className="card"
      aria-labelledby="guest-notice-title"
      style={{
        maxWidth: 560,
        display: 'grid',
        gap: 'var(--s-3)',
        borderLeft: '3px solid var(--accent)',
      }}
    >
      <h2 id="guest-notice-title" style={{ font: 'var(--t-body-bold)', margin: 0 }}>
        {t('guest.title')}
      </h2>
      <p style={{ font: 'var(--t-caption)', color: 'var(--text-near-white)', margin: 0 }}>
        {t('guest.body')}
      </p>
      {!available && (
        <p style={{ font: 'var(--t-small)', color: 'var(--text-warning)', margin: 0 }}>
          {t('guest.offline')}
        </p>
      )}
      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        <button className="pill pill--accent" onClick={() => openDialog('register')}>
          {t('auth.createAccount')}
        </button>
        <button className="pill" onClick={() => openDialog('login')}>
          {t('auth.signIn')}
        </button>
        <button className="pill pill--outlined pill--muted" onClick={dismiss}>
          {t('guest.later')}
        </button>
      </div>
    </section>
  );
}
