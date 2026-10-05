import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role, User } from '../types';
import { authService } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role?: Role) => Promise<User>;
  signup: (name: string, email: string, password: string, role: Role) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    authService.me().then((u) => {
      if (!alive) return;
      setUserState(u);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, role?: Role) => {
    const session = await authService.login(email, password, role);
    setUserState(session.user);
    return session.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, role: Role) => {
    const session = await authService.signup(name, email, password, role);
    setUserState(session.user);
    return session.user;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUserState(null);
  }, []);

  const refresh = useCallback(async () => {
    const u = await authService.me();
    setUserState(u);
  }, []);

  const setUser = useCallback((u: User) => setUserState(u), []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refresh, setUser }),
    [user, loading, login, signup, logout, refresh, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
