export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  ACCOUNT_NOT_LINKED: 'AUTH_ACCOUNT_NOT_LINKED',
  ROLE_NOT_ALLOWED: 'AUTH_ROLE_NOT_ALLOWED',
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];
