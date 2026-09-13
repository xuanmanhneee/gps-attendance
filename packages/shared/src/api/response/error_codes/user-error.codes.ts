export const UserErrorCode = {
  NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  INVALID_ROLE: 'USER_INVALID_ROLE',
} as const;

export type UserErrorCode = (typeof UserErrorCode)[keyof typeof UserErrorCode];
