import { useState } from 'react';

import { authApi } from '@gps-attendance/shared';
import type { LoginRequest } from '@gps-attendance/shared';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const login = async (request: LoginRequest) => {
    setIsLoading(true);

    try {
      const response = await authApi.adminLogin(request);

      if (response.success) {
        localStorage.setItem('token', response.data.accessToken);
      }

      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
  };

  return {
    login,
    logout,
    isLoading,
  };
};
