import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { AuthAPI } from '../api/auth.api';
import {
  getSession,
  removeToken,
  saveSession,
} from '../services/token-storage';

const decodeTokenPayload = (token: string): Partial<User> => {
  try {
    const payload = token.split('.')[1];
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(globalThis.atob(normalizedPayload));
    return {
      id: decoded.sub,
      accountId: 0,
      code: decoded.username,
      name: decoded.username,
      role: decoded.role,
    };
  } catch {
    return {};
  }
};

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = token.split('.')[1];
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(globalThis.atob(normalizedPayload));
    return typeof decoded.exp !== 'number' || decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export interface User {
  id: number;
  code: string;
  role: 'student' | 'lecturer' | 'admin';
  name: string;
  accountId: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  lastLoginAt: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore token and user on app start
  useEffect(() => {
    restoreToken();
  }, []);

  const restoreToken = async () => {
    try {
      const session = await getSession();
      const savedToken = session.accessToken;
      const savedUser = session.user;
      const savedLastLoginAt = session.lastLoginAt;

      if (savedToken && savedUser && !isTokenExpired(savedToken)) {
        setToken(savedToken);
        setUser(savedUser);
      } else if (savedToken || savedUser) {
        await removeToken();
      }

      if (savedLastLoginAt) {
        setLastLoginAt(savedLastLoginAt);
      }
    } catch (error) {
      console.error('Failed to restore token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await AuthAPI.login(username, password);

      if (response.success && response.data) {
        const { accessToken, refreshToken } = response.data;
        const loginAt = new Date().toISOString();
        const userData: User = {
          id: decodeTokenPayload(accessToken).id ?? 0,
          accountId: 0,
          code: decodeTokenPayload(accessToken).code ?? username,
          name: decodeTokenPayload(accessToken).name ?? username,
          role: decodeTokenPayload(accessToken).role ?? 'student',
        };

        setUser(userData);
        setToken(accessToken);
        setLastLoginAt(loginAt);

        // Save to persistent storage
        await saveSession(accessToken, refreshToken, userData, loginAt);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await removeToken();
  };

  const value: AuthContextType = {
    user,
    token,
    lastLoginAt,
    isLoading,
    isSignedIn: !!user,
    login,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
