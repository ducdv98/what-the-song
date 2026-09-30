'use client';

import { useAuth } from './AuthProvider';
import { AuthDialog } from './AuthDialog';
import { useI18n } from './I18nProvider';

/**
 * Who is playing, top right: Sign in / Register for a guest, or the username
 * with Sign out. Always rendered and always usable — even while the session
 * check is still running, since opening the dialog does not depend on it. If
 * the API is down the buttons stay: signing in then says the server is
 * unreachable, which is honest, instead of the controls silently vanishing.
 *
 * Also hosts the one sign-in dialog, which the guest notice opens too.
 */
export function AccountBar() {
  const { t } = useI18n();
  const { status, user, logout, expired, dialog, openDialog, closeDialog } = useAuth();

  // Compact, so the header stays on one line on a phone next to the logo.
  const small = { padding: '6px 10px', fontSize: 12, letterSpacing: '0.6px', whiteSpace: 'nowrap' as const };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--s-2)',
        flexWrap: 'nowrap',
        justifyContent: 'flex-end',
        minHeight: 32,
      }}
      aria-busy={status === 'loading'}
    >
      {expired && (
        <span role="status" style={{ font: 'var(--t-small)', color: 'var(--text-warning)' }}>
          {t('auth.error.unauthenticated')}
        </span>
      )}
      {status === 'user' && user ? (
        <>
          <span style={{ font: 'var(--t-caption-bold)', color: 'var(--text-base)' }}>{user.username}</span>
          <button className="pill pill--outlined pill--muted" style={small} onClick={() => void logout()}>
            {t('auth.signOut')}
          </button>
        </>
      ) : (
        <>
          <button
            className="pill pill--muted"
            style={small}
            onClick={() => openDialog('login')}
          >
            {t('auth.signIn')}
          </button>
          {/* Hidden on narrow phones to keep the header on one line; the
              dialog's Register tab and the guest notice still offer it. */}
          <button
            className="pill pill--accent hide-narrow"
            style={small}
            onClick={() => openDialog('register')}
          >
            {t('auth.register')}
          </button>
        </>
      )}
      <AuthDialog
        open={dialog !== null}
        mode={dialog ?? 'login'}
        onMode={openDialog}
        onClose={closeDialog}
      />
    </div>
  );
}
