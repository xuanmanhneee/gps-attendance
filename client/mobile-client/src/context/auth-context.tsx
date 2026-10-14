import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { AuthAPI } from '../api/auth.api';
import {
  getSession,
  removeToken,
  saveSession,
} from '../services/token-storage';
import { saveToken as saveInMemoryToken } from '../services/token';

export interface User {
  id: number;
  code: string;
  role: 'student' | 'lecturer' | 'admin';
  name: string;
  accountId: number;
}

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

interface AuthContextType {
  user: User | null;
  token: string | null;
  lastLoginAt: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (
    username: string,
    password: string,
    isLecturer?: boolean,
    rememberLogin?: boolean,
  ) => Promise<void>;
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
      const savedUser = session.user as User | null;
      const savedLastLoginAt = session.lastLoginAt;

      if (session.rememberLogin && savedToken && savedUser && !isTokenExpired(savedToken)) {
        setToken(savedToken);
        setUser(savedUser);
        await saveInMemoryToken(savedToken);
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

  const login = async (
    username: string,
    password: string,
    isLecturer = false,
    rememberLogin = false,
  ) => {
    try {
      setIsLoading(true);
      const response = await AuthAPI.login(username, password, isLecturer);

      if (response.success && response.data) {
        const { accessToken, refreshToken } = response.data;
        const loginAt = new Date().toISOString();
        const payload = decodeTokenPayload(accessToken);
        const userData: User = {
          id: payload.id ?? 0,
          accountId: 0,
          code: payload.code ?? username,
          name: payload.name ?? username,
          role: (payload.role as 'student' | 'lecturer' | 'admin') ?? 'student',
        };

        setUser(userData);
        setToken(accessToken);
        setLastLoginAt(loginAt);

        // Save to persistent storage and in-memory token
        await saveInMemoryToken(accessToken);
        await saveSession(accessToken, refreshToken, userData, loginAt, rememberLogin);
      } else {
        throw new Error((!response.success && response.message) || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await AuthAPI.logout(token).catch(() => {});
      }
    } finally {
      setUser(null);
      setToken(null);
      setLastLoginAt(null);
      await removeToken();
    }
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
