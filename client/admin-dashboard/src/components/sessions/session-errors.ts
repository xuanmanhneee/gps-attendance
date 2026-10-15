import {
  ApiError,
  AttendanceSessionErrorCode,
  CommonErrorCode,
} from '@gps-attendance/shared';

import type { TranslationKey } from '../../i18n/translation-keys';

/**
 * Map lỗi Attendance Sessions từ backend sang translation key.
 *
 * Chỉ dựa trên `ApiError.code` (common code hoặc domain code của
 * attendance-session), không phụ thuộc chuỗi message và không render
 * `Error.message`/message backend ra UI.
 */
export const sessionErrorKeyByCode: Record<string, TranslationKey> = {
  [CommonErrorCode.VALIDATION_ERROR]: 'sessions.error.validation',
  [CommonErrorCode.UNAUTHORIZED]: 'sessions.error.unauthorized',
  [CommonErrorCode.FORBIDDEN]: 'sessions.error.forbidden',
  [CommonErrorCode.NOT_FOUND]: 'sessions.error.notFound',
  [CommonErrorCode.CONFLICT]: 'sessions.error.conflict',
  [CommonErrorCode.TOO_MANY_REQUESTS]: 'sessions.error.tooManyRequests',
  [CommonErrorCode.INTERNAL_ERROR]: 'sessions.error.internal',
  [CommonErrorCode.UNKNOWN_ERROR]: 'sessions.error.unknown',

  [AttendanceSessionErrorCode.NOT_FOUND]: 'sessions.error.notFound',
  [AttendanceSessionErrorCode.INVALID_TIME_RANGE]:
    'sessions.error.invalidTimeRange',
  [AttendanceSessionErrorCode.INVALID_RADIUS]: 'sessions.error.invalidRadius',
  // Shared gộp `CREATION_FORBIDDEN`/`CANCEL_FORBIDDEN` thành 1 code chung
  // `ATTENDANCE_SESSION_FORBIDDEN` dùng cho lỗi "không phải chủ phiên" ở mọi
  // thao tác (xem `notOwnerError` ở server) nên phải map về message generic.
  [AttendanceSessionErrorCode.FORBIDDEN]: 'sessions.error.forbidden',
};

/** Ngữ cảnh gọi API — quyết định message fallback khi không map được code. */
export type SessionErrorContext = 'list' | 'detail' | 'create';

export const sessionErrorFallbackKeyByContext: Record<
  SessionErrorContext,
  TranslationKey
> = {
  list: 'sessions.loadError',
  detail: 'sessionDetail.loadError',
  create: 'sessions.createError',
};

export const getSessionApiErrorCode = (error: unknown): string | null =>
  error instanceof ApiError && error.code ? error.code : null;

export const resolveSessionErrorKey = (
  error: unknown,
  context: SessionErrorContext,
): TranslationKey => {
  const code = getSessionApiErrorCode(error);

  if (code && sessionErrorKeyByCode[code]) {
    return sessionErrorKeyByCode[code];
  }

  return sessionErrorFallbackKeyByContext[context];
};

/** Chi tiết kỹ thuật chỉ đi vào console, không render ra UI. */
export const logSessionError = (
  context: SessionErrorContext,
  error: unknown,
): void => {
  console.error(`[attendance-sessions:${context}]`, error);
};
