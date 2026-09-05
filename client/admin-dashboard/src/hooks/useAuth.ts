import { useState } from 'react';

import type { LoginRequest } from '@gps-attendance/shared';

import { authApi } from '../api/auth.api';
import { tokenService } from '../services/token.service';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const login = async (request: LoginRequest) => {
    setIsLoading(true);

    try {
      const response = await authApi.login(request);
      tokenService.set(response.accessToken);

      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    tokenService.remove();
  };

  return {
    login,
    logout,
    isLoading,
  };
};
