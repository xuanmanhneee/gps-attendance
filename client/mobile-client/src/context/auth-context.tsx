<<<<<<< HEAD
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
=======
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { UserProfileResponse } from '@gps-attendance/shared';

import { authApi } from '../api/auth.api';
import { userApi } from '../api/user.api';
import { removeToken, restoreToken, saveToken } from '../services/token';

interface AuthContextType {
  user: UserProfileResponse | null;
  token: string | null;
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  isLoading: boolean;
  isSignedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
<<<<<<< HEAD
  setUser: (user: User | null) => void;
=======
  setUser: (user: UserProfileResponse | null) => void;
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

<<<<<<< HEAD
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
=======
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreAuth();
  }, []);

  const restoreAuth = async () => {
    try {
      const savedToken = await restoreToken();

      if (savedToken) {
        setToken(savedToken);

        const profile = await userApi.getProfile();
        setUser(profile);
      }
    } catch (error) {
      console.error('Failed to restore auth:', error);

      await removeToken();
      setToken(null);
      setUser(null);
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
<<<<<<< HEAD
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
=======

      const response = await authApi.login(username, password);

      await saveToken(response.accessToken);
      setToken(response.accessToken);

      const profile = await userApi.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Login error:', error);

      await removeToken();
      setToken(null);
      setUser(null);

>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
<<<<<<< HEAD
    setUser(null);
    setToken(null);
    await removeToken();
=======
    try {
      setIsLoading(true);

      await authApi.logout();

      setUser(null);
      setToken(null);

      await removeToken();
    } catch (error) {
      console.error('Logout error:', error);

      setUser(null);
      setToken(null);

      await removeToken();

      throw error;
    } finally {
      setIsLoading(false);
    }
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
  };

  const value: AuthContextType = {
    user,
    token,
<<<<<<< HEAD
    lastLoginAt,
=======
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
    isLoading,
    isSignedIn: !!user,
    login,
    logout,
    setUser,
  };

<<<<<<< HEAD
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
=======
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
