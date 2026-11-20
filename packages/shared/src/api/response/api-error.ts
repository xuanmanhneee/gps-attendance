import { CommonErrorCode, type ApiErrorCode } from './codes';

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

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Lỗi tạm thời do mạng hoặc máy chủ quá tải: người dùng nên thử lại thay vì
 * hiểu là request sai (ví dụ không báo "sai mật khẩu" khi chỉ là timeout).
 */
export function isRetryableApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.code === CommonErrorCode.REQUEST_TIMEOUT ||
      error.code === CommonErrorCode.NETWORK_ERROR ||
      RETRYABLE_STATUSES.has(error.status))
  );
}
