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
  async logout(token: string): Promise<ApiResponse<null>> {
    return http.post<ApiResponse<null>>('/v0/user/auth/logout', {}, token);
  },

  /**
   * Làm mới token (refresh token)
   */
  async refreshToken(token: string): Promise<ApiResponse<{ accessToken: string }>> {
    return http.post<ApiResponse<{ accessToken: string }>>('/v0/user/auth/refresh', {}, token);
  },

};
