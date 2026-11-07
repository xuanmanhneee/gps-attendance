import {
  ApiError,
  AttendanceReviewErrorCode,
  AttendanceSessionErrorCode,
  CommonErrorCode,
} from '@gps-attendance/shared';

import type { TranslationKey } from '../../i18n/translation-keys';

const reviewErrorKeyByCode: Record<string, TranslationKey> = {
  [CommonErrorCode.UNAUTHORIZED]: 'attendanceReview.error.unauthorized',
  [CommonErrorCode.FORBIDDEN]: 'attendanceReview.error.forbidden',
  [CommonErrorCode.NOT_FOUND]: 'attendanceReview.error.notFound',
  [CommonErrorCode.TOO_MANY_REQUESTS]: 'attendanceReview.error.tooManyRequests',
  [CommonErrorCode.INTERNAL_ERROR]: 'attendanceReview.error.internal',
  [AttendanceSessionErrorCode.NOT_FOUND]: 'attendanceReview.error.notFound',
  [AttendanceSessionErrorCode.FORBIDDEN]: 'attendanceReview.error.forbidden',
  [AttendanceSessionErrorCode.INVALID_TIME_RANGE]:
    'attendanceReview.error.windowClosed',
  [AttendanceReviewErrorCode.USER_NOT_IN_SESSION]:
    'attendanceReview.error.notFound',
  [AttendanceReviewErrorCode.ALREADY_CHECKED_IN]:
    'attendanceReview.error.alreadyResolved',
  [AttendanceReviewErrorCode.RECORD_LOCKED]:
    'attendanceReview.error.alreadyResolved',
  [AttendanceReviewErrorCode.CANDIDATE_NOT_FOUND]:
    'attendanceReview.error.alreadyResolved',
  [AttendanceReviewErrorCode.RESOLUTION_WINDOW_CLOSED]:
    'attendanceReview.error.windowClosed',
};

export const resolveAttendanceReviewErrorKey = (
  error: unknown,
  context: 'list' | 'resolve',
): TranslationKey => {
  const code = error instanceof ApiError ? error.code : null;

  return (
    (code ? reviewErrorKeyByCode[code] : undefined) ??
    (context === 'list'
      ? 'attendanceReview.error.load'
      : 'attendanceReview.error.resolve')
  );
};
