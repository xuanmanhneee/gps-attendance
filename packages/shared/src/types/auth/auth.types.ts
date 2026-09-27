export type Role = 'admin' | 'lecturer' | 'student';

export const ROLES: readonly Role[] = ['admin', 'lecturer', 'student'] as const;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}
