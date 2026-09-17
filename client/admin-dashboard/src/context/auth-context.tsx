import { useEffect, useState, type ReactNode } from 'react';

import type { LoginRequest, UserProfileResponse } from '@gps-attendance/shared';

import { authApi } from '../api/auth.api';
import { tokenService } from '../services/token.service';
import { usersApi } from '../api/users.api';

interface AuthContextValue {
  user: UserProfileResponse | null;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = tokenService.get();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await usersApi.getMe();
        setUser(user);
      } catch {
        tokenService.remove();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, []);

  const login = async (request: LoginRequest) => {
    setIsLoading(true);

    try {
      console.log('1. before authApi.login');

      const response = await authApi.login(request);

      console.log('2. login response:', response);

      tokenService.set(response.accessToken);

      console.log('3. before getMe');

      const user = await usersApi.getMe();

      console.log('4. getMe response:', user);

      setUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    tokenService.remove();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
