import type { LoginResponse } from '@gps-attendance/shared';

import { httpClient, unauthenticatedHttpClient } from './http';

export const authApi = {
  login(username: string, password: string) {
    return unauthenticatedHttpClient.post<LoginResponse>('/v0/user/auth/login', {
      username,
      password,
    });
  },

  logout() {
    return httpClient.post<null>('/v0/user/auth/logout');
  },

  refreshToken(refreshToken: string) {
    return unauthenticatedHttpClient.post<LoginResponse>(
      '/v0/user/auth/refresh',
      { refreshToken },
    );
  },
};
