'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { AuthDialog, type AuthMode } from './AuthDialog';
import { useI18n } from './I18nProvider';

/**
 * Who is playing, top right: "Guest · Sign in · Register", or the username
 * with a sign-out. Hidden entirely when there is no account API to talk to, so
 * a static-only deployment shows a plain guest game rather than broken buttons.
 */
export function AccountBar() {
  const { t } = useI18n();
  const { status, user, available, logout, expired } = useAuth();
  const [dialog, setDialog] = useState<AuthMode | null>(null);

  if (status === 'loading' || !available) return null;

  const small = { padding: '6px 12px' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {expired && (
        <span role="status" style={{ font: 'var(--t-small)', color: 'var(--text-warning)' }}>
          {t('auth.error.unauthenticated')}
        </span>
      )}
      {user ? (
        <>
          <span style={{ font: 'var(--t-caption-bold)', color: 'var(--text-base)' }}>{user.username}</span>
          <button className="pill pill--outlined pill--muted" style={small} onClick={() => void logout()}>
            {t('auth.signOut')}
          </button>
        </>
      ) : (
        <>
          <button className="pill pill--muted" style={small} onClick={() => setDialog('login')}>
            {t('auth.signIn')}
          </button>
          <button className="pill pill--accent" style={small} onClick={() => setDialog('register')}>
            {t('auth.register')}
          </button>
        </>
      )}
      <AuthDialog
        open={dialog !== null}
        mode={dialog ?? 'login'}
        onMode={setDialog}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
