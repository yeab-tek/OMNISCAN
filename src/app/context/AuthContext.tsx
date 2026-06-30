// src/app/context/AuthContext.tsx
// ============================================================
// Real authentication against the FastAPI backend.
// Replaces the old `isLoggedIn` boolean in App.tsx.
// Persists the session in localStorage so refresh doesn't log you out.
// ============================================================

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, ApiError, getToken, setStoredUser, setToken, clearToken, StoredUser } from '../lib/api';

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
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If the API client detects a 401 anywhere in the app, force logout.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('omniscan:unauthorized', handler);
    return () => window.removeEventListener('omniscan:unauthorized', handler);
  }, []);

  // On mount, verify the stored token is still valid by calling /api/auth/me.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      // No token — clear any stale user data and stay on login screen.
      clearToken();
      setUser(null);
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
      try {
        const res = await api.post<LoginResponse>(
          '/api/v1/auth/login',
          { email, password },
          { noAuth: true }
        );
        setToken(res.access_token);
        setStoredUser(res.user);
        setUser(res.user);
        setIsLoading(false);
        return { ok: true };
      } catch (err) {
        setIsLoading(false);
        if (err instanceof ApiError) {
          return { ok: false, error: err.message };
        }
        return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
      }
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
