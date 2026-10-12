import type {
  AttendanceParticipantResponse,
  AttendanceSessionDetailResponse,
  AttendanceSessionResponse,
  AttendanceStatus,
  CreateAttendanceSessionRequest,
  Role,
  SessionStatus,
} from '@gps-attendance/shared';

/**
 * Dữ liệu modal tạo phiên gửi cho hook.
 *
 * Cùng shape với `CreateAttendanceSessionRequest` (shared package) nên không
 * thể lệch field khi gọi API.
 */
export type CreateSessionFormData = CreateAttendanceSessionRequest;

const SESSION_STATUSES: readonly SessionStatus[] = ['pending', 'open', 'closed'];

const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['present', 'absent'];

const ROLES: readonly Role[] = ['admin', 'lecturer', 'student'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isSessionStatus = (value: unknown): value is SessionStatus =>
  typeof value === 'string' &&
  (SESSION_STATUSES as readonly string[]).includes(value);

export const isAttendanceStatus = (value: unknown): value is AttendanceStatus =>
  typeof value === 'string' &&
  (ATTENDANCE_STATUSES as readonly string[]).includes(value);

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

/** Parse `:id` từ route; trả `null` khi không phải số nguyên dương. */
export const parseSessionId = (value: string | undefined): number | null => {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Kiểm tra shape response trước khi ghi vào state.
 *
 * Nhờ vậy UI không hiển thị "thành công giả" khi backend trả payload khác
 * contract, và component chỉ đọc các field đã được xác nhận.
 */
export const isAttendanceSession = (
  value: unknown,
): value is AttendanceSessionResponse => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'number' &&
    Number.isInteger(value.id) &&
    value.id > 0 &&
    typeof value.title === 'string' &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    isFiniteNumber(value.radius) &&
    typeof value.openAt === 'string' &&
    typeof value.closeAt === 'string' &&
    isSessionStatus(value.status)
  );
};

export const isAttendanceSessionList = (
  value: unknown,
): value is AttendanceSessionResponse[] =>
  Array.isArray(value) && value.every(isAttendanceSession);

/**
 * Participant của phiên: cần `code`, `fullname`, `role` và trạng thái
 * `present`/`absent` (xem `AttendanceParticipantResponse`).
 */
export const isAttendanceParticipant = (
  value: unknown,
): value is AttendanceParticipantResponse => {
  if (!isRecord(value)) return false;

  const user = value.user;

  if (!isRecord(user)) return false;

  return (
    typeof user.code === 'string' &&
    typeof user.fullname === 'string' &&
    isRole(user.role) &&
    isAttendanceStatus(value.status) &&
    (value.checkedInAt === null || typeof value.checkedInAt === 'string') &&
    typeof value.updatedAt === 'string'
  );
};

export const isAttendanceSessionDetail = (
  value: unknown,
): value is AttendanceSessionDetailResponse => {
  if (!isAttendanceSession(value)) return false;

  // `value` đã là `AttendanceSessionResponse`; đọc `participants` qua record
  // để không phụ thuộc field chưa được narrow bởi type guard trước đó.
  const participants = (value as unknown as Record<string, unknown>).participants;

  return Array.isArray(participants) && participants.every(isAttendanceParticipant);
};
