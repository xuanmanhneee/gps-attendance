import { useEffect, useState, type ReactNode } from 'react';

import type { LoginRequest, UserProfileDto } from '@gps-attendance/shared';
import { authApi } from '../api/auth.api';
import { tokenService } from '../services/token.service';
import { usersApi } from '../api/users.api';
import { AuthContext } from './auth-context-value';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfileDto | null>(null);
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
      const response = await authApi.login(request);

      tokenService.set(response.accessToken);

      const user = await usersApi.getMe();
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
