import type { ApiErrorCode } from './error_codes';

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode | null,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
