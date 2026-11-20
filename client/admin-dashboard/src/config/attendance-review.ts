import type { AttendanceValidationReason } from '@gps-attendance/shared';

import type { TranslationKey } from '../i18n/translation-keys';

export const ATTENDANCE_REVIEW_REASON_LABEL_KEYS: Record<
  AttendanceValidationReason,
  TranslationKey
> = {
  LOW_CONFIDENCE_SCORE: 'attendanceReview.reason.lowConfidence',
  MOCK_LOCATION: 'attendanceReview.reason.mockLocation',
  OUT_OF_RANGE: 'attendanceReview.reason.outOfRange',
  INVALID_LOCATION_TIMESTAMP: 'attendanceReview.reason.invalidTimestamp',
};

export type ReviewResolutionState = 'not-open' | 'open' | 'closed';

const REVIEW_RESOLUTION_GRACE_MS = 10 * 60 * 1000;

export const getReviewResolutionState = (
  openAt: string,
  closeAt: string,
  nowMs = Date.now(),
): ReviewResolutionState => {
  const openAtMs = new Date(openAt).getTime();
  const closeAtMs = new Date(closeAt).getTime();

  if (!Number.isFinite(openAtMs) || !Number.isFinite(closeAtMs)) {
    return 'closed';
  }

  if (nowMs < openAtMs) return 'not-open';
  if (nowMs > closeAtMs + REVIEW_RESOLUTION_GRACE_MS) return 'closed';

  return 'open';
};
