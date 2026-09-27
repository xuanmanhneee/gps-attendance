<<<<<<< HEAD
import { http } from './api';
import type { ApiResponse, LoginResponse } from '@gps-attendance/shared';

export const AuthAPI = {
  /**
   * Đăng nhập với username và password
   */
  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return http.post<ApiResponse<LoginResponse>>('/v0/user/auth/login', {
=======
import { httpClient } from './http';
import type { LoginResponse } from '@gps-attendance/shared';

export const authApi = {
  login(username: string, password: string) {
    return httpClient.post<LoginResponse>('/v0/user/auth/login', {
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
      username,
      password,
    });
  },

<<<<<<< HEAD
  /**
   * Đăng xuất (nếu cần invalidate token trên server)
   */
  async logout(token: string): Promise<ApiResponse<null>> {
    return http.post<ApiResponse<null>>('/v0/user/auth/logout', {}, token);
  },

  /**
   * Làm mới token (refresh token)
   */
  async refreshToken(token: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return http.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/v0/user/auth/refresh',
      { refreshToken: token },
    );
  },

=======
  logout() {
    return httpClient.post<null>('/v0/user/auth/logout');
  },

  refreshToken() {
    return httpClient.post<{ accessToken: string }>('/v0/user/auth/refresh');
  },
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
};
