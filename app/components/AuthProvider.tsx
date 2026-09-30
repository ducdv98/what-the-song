'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, AuthError, type User } from '@/lib/auth/client';
import { clearStats } from '@/lib/game/stats';

/**
 * Who is playing: a guest, or a signed-in player.
 *
 * Guest is the default and a first-class state — the game never waits on the
 * account API, and if the API is missing (a static-only deployment, or it is
 * down) the game simply stays in guest mode with the sign-in button hidden.
 */
export type AuthStatus = 'loading' | 'guest' | 'user';

interface AuthCtx {
  status: AuthStatus;
  user: User | null;
  /** False when the account API could not be reached at all. */
  available: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** The server said the session is gone (expired, or signed out elsewhere). */
  sessionLost: () => void;
  /** Set by sessionLost, so the UI can say why the player is a guest again. */
  expired: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [available, setAvailable] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    authApi
      .session()
      .then((u) => {
        setUser(u);
        setStatus(u ? 'user' : 'guest');
      })
      .catch((err: unknown) => {
        setAvailable(!(err instanceof AuthError && err.code === 'unavailable'));
        setStatus('guest');
      });
  }, []);

  /**
   * Any change of identity discards the guest's session stats. A guest's
   * record is not carried into an account, and signing out must not bring
   * back a streak from before signing in.
   */
  const become = useCallback((u: User | null) => {
    clearStats();
    setUser(u);
    setStatus(u ? 'user' : 'guest');
    setAvailable(true);
    setExpired(false);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => become(await authApi.login(identifier, password)),
    [become],
  );

  const register = useCallback(
    async (username: string, email: string, password: string) =>
      become(await authApi.register(username, email, password)),
    [become],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Even if the request failed, stop presenting this browser as signed in.
      become(null);
    }
  }, [become]);

  const sessionLost = useCallback(() => {
    become(null);
    setExpired(true);
  }, [become]);

  const value = useMemo(
    () => ({ status, user, available, login, register, logout, sessionLost, expired }),
    [status, user, available, login, register, logout, sessionLost, expired],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
