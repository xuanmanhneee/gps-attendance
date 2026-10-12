import { ApiError, CommonErrorCode } from '@gps-attendance/shared';

import type { TranslationKey } from '../../i18n/translation-keys';

/**
 * Map lỗi Tags từ backend sang translation key.
 *
 * Chỉ dựa trên `ApiError.code` (common code hoặc domain code trong tương lai),
 * không phụ thuộc vào chuỗi message cụ thể và không render message kỹ thuật
 * hay `Error.message` ra UI.
 */
export const tagErrorKeyByCode: Record<string, TranslationKey> = {
  [CommonErrorCode.VALIDATION_ERROR]: 'tags.error.validation',
  [CommonErrorCode.UNAUTHORIZED]: 'tags.error.unauthorized',
  [CommonErrorCode.FORBIDDEN]: 'tags.error.forbidden',
  [CommonErrorCode.NOT_FOUND]: 'tags.error.notFound',
  [CommonErrorCode.CONFLICT]: 'tags.error.conflict',
  [CommonErrorCode.TOO_MANY_REQUESTS]: 'tags.error.tooManyRequests',
  [CommonErrorCode.INTERNAL_ERROR]: 'tags.error.internal',
  [CommonErrorCode.UNKNOWN_ERROR]: 'tags.error.unknown',
};

export type TagErrorContext =
  | 'list'
  | 'create'
  | 'delete'
  | 'assignment'
  | 'directory'
  | 'refresh';

/** Message dịch cố định cho lỗi không nhận diện được theo từng ngữ cảnh. */
export const tagErrorFallbackKeyByContext: Record<
  TagErrorContext,
  TranslationKey
> = {
  list: 'tags.loadError',
  create: 'tags.createError',
  delete: 'tags.deleteError',
  assignment: 'tags.assignmentLoadError',
  directory: 'tags.directoryLoadError',
  refresh: 'tags.refreshError',
};

export const getTagApiErrorCode = (error: unknown): string | null =>
  error instanceof ApiError && error.code ? error.code : null;

export const resolveTagErrorKey = (
  error: unknown,
  context: TagErrorContext,
): TranslationKey => {
  const code = getTagApiErrorCode(error);

  if (code && tagErrorKeyByCode[code]) {
    return tagErrorKeyByCode[code];
  }

  return tagErrorFallbackKeyByContext[context];
};

/**
 * Chi tiết kỹ thuật chỉ đi vào console, không bao giờ render ra UI.
 */
export const logTagError = (context: TagErrorContext, error: unknown): void => {
  console.error(`[tags:${context}]`, error);
};

