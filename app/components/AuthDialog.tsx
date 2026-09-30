'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AuthError } from '@/lib/auth/client';
import type { MessageKey } from '@/lib/i18n/messages';
import { useAuth } from './AuthProvider';
import { useI18n } from './I18nProvider';

export type AuthMode = 'login' | 'register';

/**
 * Sign-in and registration in one native <dialog>.
 *
 * showModal() gives focus trapping, Escape to close and an inert page behind it
 * for free, which is most of what makes a modal accessible. Inputs carry the
 * autocomplete tokens password managers look for — "current-password" versus
 * "new-password" is what makes them offer to fill or to generate.
 */
export function AuthDialog({
  open,
  mode,
  onMode,
  onClose,
}: {
  open: boolean;
  mode: AuthMode;
  onMode: (m: AuthMode) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const ref = useRef<HTMLDialogElement>(null);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // A stale error from the other form is confusing; so is a password left
  // sitting in the field after the dialog closes.
  useEffect(() => setError(null), [mode]);
  useEffect(() => {
    if (!open) {
      setPassword('');
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === 'login') await login(identifier, password);
      else await register(username, email, password);
      onClose();
    } catch (err) {
      const code = err instanceof AuthError ? err.code : 'server_error';
      setError(`auth.error.${code}` as MessageKey);
    } finally {
      setPending(false);
    }
  }

  const field = (
    name: string,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    hint?: string,
  ) => (
    <label htmlFor={`${id}-${name}`} style={{ display: 'grid', gap: 'var(--s-1)' }}>
      <span style={{ font: 'var(--t-small-bold)', color: 'var(--text-muted)' }}>{label}</span>
      <input id={`${id}-${name}`} name={name} className="search" required {...props} />
      {hint && <span style={{ font: 'var(--t-small)', color: 'var(--text-muted)' }}>{hint}</span>}
    </label>
  );

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby={`${id}-title`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-2)' }}>
        <h2 id={`${id}-title`} style={{ font: 'var(--t-section-title)', margin: 0 }}>
          {t('auth.title')}
        </h2>
        <button className="pill pill--muted" onClick={onClose} aria-label={t('auth.close')} style={{ padding: '4px 10px' }}>
          ✕
        </button>
      </div>
      <p style={{ font: 'var(--t-caption)', color: 'var(--text-muted)', margin: '0 0 var(--s-4)' }}>
        {t('auth.why')}
      </p>

      <div role="tablist" style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-5)' }}>
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? 'pill pill--accent' : 'pill pill--muted'}
            onClick={() => onMode(m)}
          >
            {m === 'login' ? t('auth.signIn') : t('auth.register')}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--s-4)' }}>
        {mode === 'login' ? (
          field('identifier', t('auth.identifier'), {
            value: identifier,
            onChange: (e) => setIdentifier(e.target.value),
            autoComplete: 'username',
            autoCapitalize: 'none',
            spellCheck: false,
          })
        ) : (
          <>
            {field(
              'username',
              t('auth.username'),
              {
                value: username,
                onChange: (e) => setUsername(e.target.value),
                autoComplete: 'username',
                autoCapitalize: 'none',
                spellCheck: false,
                minLength: 3,
                maxLength: 20,
                pattern: '[A-Za-z0-9_]{3,20}',
              },
              t('auth.usernameHint'),
            )}
            {field('email', t('auth.email'), {
              type: 'email',
              value: email,
              onChange: (e) => setEmail(e.target.value),
              autoComplete: 'email',
            })}
          </>
        )}
        {field(
          'password',
          t('auth.password'),
          {
            type: 'password',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            autoComplete: mode === 'login' ? 'current-password' : 'new-password',
            minLength: mode === 'register' ? 8 : undefined,
            maxLength: 128,
          },
          mode === 'register' ? t('auth.passwordHint') : undefined,
        )}

        {error && (
          <p role="alert" style={{ font: 'var(--t-caption)', color: 'var(--text-negative)', margin: 0 }}>
            {t(error)}
          </p>
        )}

        <button type="submit" className="pill pill--accent pill--large" disabled={pending}>
          {pending ? t('auth.working') : mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
        </button>
      </form>
    </dialog>
  );
}
