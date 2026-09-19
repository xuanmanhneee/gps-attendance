import { useEffect, useState, type ReactNode } from 'react';

import type { LoginRequest } from '@gps-attendance/shared';

import { authApi } from '../api/auth.api';
import { usersApi } from '../api/users.api';
import { tokenService } from '../services/token.service';
import { AuthContext } from './auth-context-value';
import type { AuthContextValue } from './auth-context-value';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    const token = tokenService.get();

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setUser(await usersApi.getMe());
    } catch {
      tokenService.remove();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Tải user một lần khi mount. Mọi setState trong loadUser đều nằm sau
    // `await` nên không gây cascading render như rule suy đoán.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUser();
  }, []);

  const login = async (request: LoginRequest) => {
    setIsLoading(true);

    try {
      const response = await authApi.login(request);
      tokenService.set(response.accessToken);
      setUser(await usersApi.getMe());
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    tokenService.remove();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
