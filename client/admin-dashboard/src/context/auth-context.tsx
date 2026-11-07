import { useEffect, useState, type ReactNode } from 'react';

import type { LoginRequest } from '@gps-attendance/shared';

import { authApi } from '../api/auth.api';
import { clearGetCache } from '../api/http';
import { usersApi } from '../api/users.api';
import { tokenService } from '../services/token.service';
import { AuthContext } from './auth-context-value';
import type { AuthContextValue } from './auth-context-value';

/**
 * Cung cấp trạng thái xác thực cho admin dashboard.
 *
 * AuthProvider chịu trách nhiệm khôi phục user từ access token, đăng nhập và
 * đăng xuất. Context object và type được đặt riêng trong
 * `auth-context-value.ts` để tách state contract khỏi provider component.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    const token = tokenService.get();

    if (!token && !tokenService.getRefresh()) {
      setIsLoading(false);
      return;
    }

    try {
      setUser(await usersApi.getMe());
    } catch {
      tokenService.remove();
      clearGetCache();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleExpired = () => {
      clearGetCache();
      setUser(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    // Tải user một lần khi mount. Mọi setState trong loadUser đều nằm sau
    // `await` nên không gây cascading render như rule suy đoán.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUser();
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (request: LoginRequest, rememberMe = false) => {
    setIsLoading(true);

    try {
      const response = await authApi.login(request);
      tokenService.set(
        response.accessToken,
        rememberMe ? response.refreshToken : undefined,
      );
      clearGetCache();
      setUser(await usersApi.getMe());
    } catch (error) {
      tokenService.remove();
      clearGetCache();
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    tokenService.remove();
    clearGetCache();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
