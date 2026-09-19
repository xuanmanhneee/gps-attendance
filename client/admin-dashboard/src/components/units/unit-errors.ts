import { ApiError, UnitErrorCode } from '@gps-attendance/shared';

import type { TranslationKey } from '../../i18n/translation-keys';

/**
 * Map lỗi nghiệp vụ Units từ backend sang translation key.
 * Tên lỗi là dữ liệu từ API; UI không hard-code message backend.
 */
export const unitErrorKeyByCode: Record<string, TranslationKey> = {
  [UnitErrorCode.NOT_FOUND]: 'units.error.notFound',
  [UnitErrorCode.PARENT_NOT_FOUND]: 'units.error.parentNotFound',
  [UnitErrorCode.SELF_REFERENCE]: 'units.error.selfReference',
  [UnitErrorCode.CYCLE_DETECTED]: 'units.error.cycleDetected',
  [UnitErrorCode.HIERARCHY_CORRUPTED]: 'units.error.hierarchyCorrupted',
  [UnitErrorCode.HAS_CHILDREN]: 'units.error.hasChildren',
};

export const resolveUnitErrorKey = (error: unknown): TranslationKey | null => {
  if (error instanceof ApiError && error.code) {
    return unitErrorKeyByCode[error.code] ?? null;
  }

  return null;
};
