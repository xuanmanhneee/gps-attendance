export type Role = 'admin' | 'organizer' | 'participant';

export const ROLES: readonly Role[] = [
  'admin',
  'organizer',
  'participant',
] as const;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}
