import type React from 'react';
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { AuthTokens, LoginRequest, RegisterRequest, User } from '../types';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  login: (tokens: AuthTokens, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  loginWithCredentials: (data: LoginRequest) => Promise<void>;
}

const AUTH_KEY = 'gigplatform_tokens';
const USER_KEY = 'gigplatform_user';
const API_BASE_URL = ''; // Использует прокси Vite (/api -> http://localhost:8000)

export const AuthContext = createContext<AuthContextType | null>(null);

function getStoredTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [tokens, setTokens] = useState<AuthTokens | null>(() => getStoredTokens());

  useEffect(() => {
    if (tokens) localStorage.setItem(AUTH_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(AUTH_KEY);

    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [tokens, user]);

  const login = useCallback((newTokens: AuthTokens, newUser: User) => {
    setTokens(newTokens);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setTokens(null);
    setUser(null);
  }, []);

  const loginWithCredentials = useCallback(async (data: LoginRequest) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Login failed');
    const result = await response.json();
    const accessTokens: AuthTokens = {
      access_token: result.access_token,
      refresh_token: result.access_token,
    };
    login(accessTokens, result.user);
  }, [login]);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Registration failed');
    const result = await response.json();
    const accessTokens: AuthTokens = {
      access_token: result.access_token,
      refresh_token: result.access_token,
    };
    login(accessTokens, result.user);
  }, [login]);

  const refreshUser = useCallback(async () => {
    if (!tokens) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (response.ok) {
        setUser((await response.json()) as User);
      }
    } catch {
      // ignore
    }
  }, [tokens]);

  const value = useMemo(() => ({
    user,
    tokens,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    register,
    loginWithCredentials,
  }), [user, tokens, login, logout, refreshUser, register, loginWithCredentials]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
