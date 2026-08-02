import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../lib/constants';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  /** The user's MongoDB ObjectId — also used as patientId / elderlyId */
  id: string;
  email: string;
  role?: 'normal' | 'family' | 'doctor';
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** Call this after a successful login/signup API response */
  setAuth: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Decodes the payload of a JWT without verifying the signature.
 * The backend already validated it — this is purely for reading claims in the FE.
 */
function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(json) as { sub?: string; email?: string; role?: string };
    if (!payload.sub || !payload.email) return null;
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as AuthUser['role'],
    };
  } catch {
    return null;
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(AUTH_TOKEN_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as AuthUser;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Hydrate from the token in case AUTH_USER_KEY is missing
  useEffect(() => {
    if (token && !user) {
      const decoded = decodeJwtPayload(token);
      if (decoded) {
        setUser(decoded);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(decoded));
      }
    }
  }, [token, user]);

  const setAuth = useCallback((newToken: string) => {
    const decoded = decodeJwtPayload(newToken);
    if (!decoded) {
      console.error('AuthContext: could not decode token payload');
      return;
    }
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(decoded));
    setToken(newToken);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, setAuth, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
