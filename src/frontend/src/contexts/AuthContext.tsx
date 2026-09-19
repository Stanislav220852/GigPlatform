import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthTokens, LoginRequest, RegisterRequest, User } from '../types';

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

export const AuthContext = createContext<AuthContextType | null>(null);

function getStoredTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) as AuthTokens : null;
  } catch {
    return null;
  }
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as User : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: JSX.Element }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [tokens, setTokens] = useState<AuthTokens | null>(() => getStoredTokens());

  useEffect(() => {
    if (tokens) localStorage.setItem(AUTH_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(AUTH_KEY);

    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [tokens, user]);

  const login = (newTokens: AuthTokens, newUser: User) => {
    setTokens(newTokens);
    setUser(newUser);
  };

  const logout = () => {
    setTokens(null);
    setUser(null);
  };

  const loginWithCredentials = async (data: LoginRequest) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Login failed');
    const { access_token, refresh_token } = await response.json() as AuthTokens;
    const currentUser = await fetch('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    }).then(res => res.json());
    login({ access_token, refresh_token }, currentUser);
  };

  const register = async (data: RegisterRequest) => {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Registration failed');
    const { access_token, refresh_token } = await response.json() as AuthTokens;
    const currentUser = await fetch('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    }).then(res => res.json());
    login({ access_token, refresh_token }, currentUser);
  };

  const refreshUser = async () => {
    if (!tokens) return;
    const response = await fetch('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (response.ok) setUser(await response.json() as User);
  };

  const value = useMemo(() => ({
    user, tokens, isAuthenticated: !!user,
    login, logout, refreshUser, register, loginWithCredentials,
  }), [user, tokens]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
