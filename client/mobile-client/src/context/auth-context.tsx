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
  isLoading: boolean;
  isSignedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfileResponse | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);

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

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // TODO(tạm thời): chưa gọi endpoint logout (/v0/user/auth/logout).
      // Bật lại khi cần: await authApi.logout();

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
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isSignedIn: !!user,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
