import { ROLES } from '@gps-attendance/shared';
import type {
  AttendanceReviewCandidateResponse,
  AttendanceReviewDecision,
  AttendanceReviewHistoryResponse,
  AttendanceValidationReason,
  Role,
} from '@gps-attendance/shared';

const REVIEW_REASONS: readonly AttendanceValidationReason[] = [
  'LOW_CONFIDENCE_SCORE',
  'MOCK_LOCATION',
  'OUT_OF_RANGE',
  'INVALID_LOCATION_TIMESTAMP',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPositiveId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

const isReviewReason = (value: unknown): value is AttendanceValidationReason =>
  typeof value === 'string' &&
  (REVIEW_REASONS as readonly string[]).includes(value);

const isReviewDecision = (value: unknown): value is AttendanceReviewDecision =>
  value === 'approve' || value === 'reject';

export const isAttendanceReviewCandidate = (
  value: unknown,
): value is AttendanceReviewCandidateResponse => {
  if (!isRecord(value) || !isRecord(value.student)) return false;

  return (
    isPositiveId(value.sessionId) &&
    isPositiveId(value.userId) &&
    typeof value.student.code === 'string' &&
    typeof value.student.fullname === 'string' &&
    isRole(value.student.role) &&
    Array.isArray(value.reasons) &&
    value.reasons.length > 0 &&
    value.reasons.every(isReviewReason)
  );
};

export const parseAttendanceReviewCandidates = (
  value: unknown,
): AttendanceReviewCandidateResponse[] | null => {
  if (!Array.isArray(value)) return null;

  const candidates = value.filter(isAttendanceReviewCandidate);
  const droppedCount = value.length - candidates.length;

  if (droppedCount > 0) {
    console.warn(
      `[attendance-reviews] Bỏ qua ${droppedCount} yêu cầu sai shape khi tải hàng chờ`,
    );
  }

  return candidates;
};

export const isAttendanceReviewHistoryItem = (
  value: unknown,
): value is AttendanceReviewHistoryResponse => {
  if (
    !isRecord(value) ||
    !isRecord(value.session) ||
    !isRecord(value.student)
  ) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    isPositiveId(value.session.id) &&
    typeof value.session.title === 'string' &&
    typeof value.student.code === 'string' &&
    typeof value.student.fullname === 'string' &&
    isRole(value.student.role) &&
    isReviewDecision(value.decision) &&
    Array.isArray(value.reasons) &&
    value.reasons.every(isReviewReason) &&
    (value.reason === null || typeof value.reason === 'string') &&
    typeof value.resolvedAt === 'string' &&
    Number.isFinite(Date.parse(value.resolvedAt))
  );
};

export const parseAttendanceReviewHistory = (
  value: unknown,
): AttendanceReviewHistoryResponse[] | null => {
  if (!Array.isArray(value)) return null;
  return value.every(isAttendanceReviewHistoryItem) ? value : null;
};
