import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { lmsApi } from '../api/lms-api';
import { getToken, setToken } from '../api/http-client';
import type { LmsUser } from '../types';

type AuthContextValue = { user: LmsUser | null; loading: boolean; login: (username: string, password: string) => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LmsUser | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    lmsApi.me().then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const session = await lmsApi.login(username, password);
    setToken(session.token);
    setUser(session.user);
  }

  async function logout() {
    try { await lmsApi.logout(); } finally { setToken(null); setUser(null); }
  }

  return <AuthContext value={{ user, loading, login, logout }}>{children}</AuthContext>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
