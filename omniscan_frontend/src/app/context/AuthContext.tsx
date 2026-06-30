// src/app/context/AuthContext.tsx
// ============================================================
// Real authentication against the FastAPI backend.
// Replaces the old `isLoggedIn` boolean in App.tsx.
// Persists the session in localStorage so refresh doesn't log you out.
// ============================================================

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, ApiError, getStoredUser, getToken, setStoredUser, setToken, clearToken, StoredUser } from '../lib/api';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: StoredUser;
}

interface AuthContextValue {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  // If the API client detects a 401 anywhere in the app, force logout.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('omniscan:unauthorized', handler);
    return () => window.removeEventListener('omniscan:unauthorized', handler);
  }, []);

  // On mount, verify the stored token is still valid by calling /api/auth/me.
  // Skip this check for demo sessions (they store the user but no JWT token).
  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (!token) {
      // No JWT — could be a demo session. If we have a stored user, keep them logged in.
      if (stored) setUser(stored);
      return;
    }
    api
      .get<StoredUser>('/api/v1/auth/me')
      .then((me) => {
        setStoredUser(me);
        setUser(me);
      })
      .catch(() => {
        clearToken();
        setUser(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      setIsLoading(true);

      // Demo accounts — work instantly without any backend connection
      const DEMO_USERS: Record<string, StoredUser> = {
        'admin@lataagriexport.com':     { id: 'demo-1', full_name: 'System Admin',        email: 'admin@lataagriexport.com',     role: 'system_admin' },
        'trade@lataagriexport.com':     { id: 'demo-2', full_name: 'Trade Manager',        email: 'trade@lataagriexport.com',     role: 'trade_manager' },
        'dataentry@lataagriexport.com': { id: 'demo-3', full_name: 'Data Entry Operator',  email: 'dataentry@lataagriexport.com', role: 'data_entry_operator' },
        'finance@lataagriexport.com':   { id: 'demo-4', full_name: 'Finance Officer',      email: 'finance@lataagriexport.com',   role: 'finance_officer' },
      };

      // Try the real backend first (1.5s timeout so it's fast)
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
        const res = await api.post<LoginResponse>(
          '/api/v1/auth/login',
          { email, password },
          { noAuth: true, signal: controller.signal }
        );
        clearTimeout(timer);
        setToken(res.access_token);
        setStoredUser(res.user);
        setUser(res.user);
        setIsLoading(false);
        return { ok: true };
      } catch (err) {
        // If it's a real auth error (wrong password), show it
        if (err instanceof ApiError && err.status === 400) {
          setIsLoading(false);
          return { ok: false, error: err.message };
        }
        // Otherwise (timeout, network error) — fall through to demo mode
      }

      // Demo mode — match email to a known demo account (any password works)
      const demoUser = DEMO_USERS[email.toLowerCase().trim()];
      if (demoUser) {
        setStoredUser(demoUser);
        setUser(demoUser);
        setIsLoading(false);
        return { ok: true };
      }

      setIsLoading(false);
      return { ok: false, error: 'Unknown email. Use one of the demo accounts listed below.' };
    },
    []
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
