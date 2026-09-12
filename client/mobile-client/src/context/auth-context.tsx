import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthAPI } from '../api/auth.api';

const decodeTokenPayload = (token: string): Partial<User> => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(globalThis.atob(payload));
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
      const savedToken = await AsyncStorage.getItem('authToken');
      const savedUser = await AsyncStorage.getItem('user');
      const savedLastLoginAt = await AsyncStorage.getItem('lastLoginAt');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
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
        const accessToken = response.data.accessToken;
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
        await AsyncStorage.setItem('authToken', accessToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('lastLoginAt', loginAt);
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
    try {
      setIsLoading(true);
      // Call logout API if needed
      // await AuthAPI.logout();

      setUser(null);
      setToken(null);
      setLastLoginAt(null);
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('lastLoginAt');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
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
