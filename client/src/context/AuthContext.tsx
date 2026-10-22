// ─────────────────────────────────────────────────────────────────────────────
// context/AuthContext.tsx — Global Authentication State
//
// Wraps the entire React app. When the app loads, it checks localStorage for
// a JWT token and fetches the current user from `/api/auth/me`.
// Provides `user`, `login()`, and `logout()` to any component that needs it.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export type Role = 'CLIENT' | 'FREELANCER' | 'MEDIATOR';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  walletBalance: number;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>; // useful to call after balance changes
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. On mount, check if there's a token and fetch user
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('trustpay_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch {
          // Token is invalid/expired — handled by Axios interceptor
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // 2. Login function (called from Login.tsx)
  const login = (token: string, userData: User) => {
    localStorage.setItem('trustpay_token', token);
    setUser(userData);
  };

  // 3. Logout function
  const logout = () => {
    localStorage.removeItem('trustpay_token');
    setUser(null);
    window.location.href = '/login';
  };

  // 4. Refresh user data (e.g. after top-up or getting paid)
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth anywhere: const { user, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
