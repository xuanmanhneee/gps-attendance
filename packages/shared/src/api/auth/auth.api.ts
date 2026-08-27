import type { ApiResponse } from '../response';
import type {
  LoginRequest,
  LoginResponse,
} from './auth.types';

import { http } from '../http';

export const authApi = {
  adminLogin(
    request: LoginRequest,
  ): Promise<ApiResponse<LoginResponse>> {
    return http.post<ApiResponse<LoginResponse>>(
      '/api/v0/admin/auth/login',
      request,
    );
  },

  userLogin(
    request: LoginRequest,
  ): Promise<ApiResponse<LoginResponse>> {
    return http.post<ApiResponse<LoginResponse>>(
      '/api/v0/user/auth/login',
      request,
    );
  },
};