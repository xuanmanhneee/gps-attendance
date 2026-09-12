import { httpClient } from './http';
import type { LoginResponse } from '@gps-attendance/shared';

export const authApi = {
  login(username: string, password: string) {
    return httpClient.post<LoginResponse>('/v0/user/auth/login', {
      username,
      password,
    });
  },

  logout() {
    return httpClient.post<null>('/v0/user/auth/logout');
  },

  refreshToken() {
    return httpClient.post<{ accessToken: string }>('/v0/user/auth/refresh');
  },
};
