import type { LoginRequest, LoginResponse } from '@gps-attendance/shared';

import { httpClient } from './http';

export const authApi = {
  login(request: LoginRequest) {
    return httpClient.post<LoginResponse>('/v0/admin/auth/login', request);
  },
};
