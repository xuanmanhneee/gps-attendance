import { http } from './api';
import type { ApiResponse, LoginResponse } from '@gps-attendance/shared';

export const AuthAPI = {
  /**
   * Đăng nhập với username và password
   */
  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return http.post<ApiResponse<LoginResponse>>('/v0/user/auth/login', {
      username,
      password,
    });
  },

  /**
   * Đăng xuất (nếu cần invalidate token trên server)
   */
  async logout(token?: string): Promise<ApiResponse<null>> {
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
};

export const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await AuthAPI.login(username, password);
    if (!res.success) {
      throw new Error(res.message || 'Login failed');
    }
    return res.data;
  },
  async logout(token?: string): Promise<void> {
    await AuthAPI.logout(token);
  },
  async refreshToken(token: string) {
    const res = await AuthAPI.refreshToken(token);
    if (!res.success) {
      throw new Error(res.message || 'Failed to refresh token');
    }
    return res.data;
  },
};
