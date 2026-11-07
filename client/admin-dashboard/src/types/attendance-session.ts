import { ROLES } from '@gps-attendance/shared';
import type {
  AttendanceParticipantResponse,
  AttendanceSessionDetailResponse,
  AttendanceSessionResponse,
  AttendanceStatus,
  CreateAttendanceSessionRequest,
  Role,
  SessionStatus,
  UserResponse,
} from '@gps-attendance/shared';

/**
 * Dữ liệu tạo phiên gửi API.
 *
 * Cùng shape với `CreateAttendanceSessionRequest` (shared package) nên không
 * thể lệch field khi gọi API.
 */
export type CreateSessionFormData = CreateAttendanceSessionRequest;

const SESSION_STATUSES: readonly SessionStatus[] = [
  'pending',
  'open',
  'closed',
  'cancelled',
];

const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'excused',
];

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

/**
 * Chuẩn hoá danh sách phiên từ API trước khi ghi state.
 *
 * Trả `null` khi payload không phải mảng: vi phạm contract ở mức không thể bỏ
 * qua nên caller vẫn phải coi là lỗi tải.
 *
 * Với payload là mảng, chỉ giữ các item đúng shape và bỏ item lệch. Trước đây
 * dùng `every` nên một bản ghi lỗi làm mất cả danh sách người dùng đang xem
 * (vd khi backend thêm trạng thái `cancelled` mà guard chưa cập nhật).
 */
export const parseAttendanceSessionList = (
  value: unknown,
): AttendanceSessionResponse[] | null => {
  if (!Array.isArray(value)) return null;

  const sessions = value.filter(isAttendanceSession);
  const droppedCount = value.length - sessions.length;

  // Chi tiết kỹ thuật chỉ ghi ra console, không render ra UI.
  if (droppedCount > 0) {
    console.warn(
      `[attendance-sessions] Bỏ qua ${droppedCount} phiên sai shape khi tải danh sách`,
    );
  }

  return sessions;
};

/**
 * Participant của phiên: cần `code`, `fullname`, `role` và trạng thái
 * `present`/`absent`/`late`/`excused` (xem `AttendanceParticipantResponse`).
 */
const isParticipantUser = (user: unknown): user is UserResponse => {
  if (!isRecord(user)) return false;
  return (
    typeof user.code === 'string' &&
    typeof user.fullname === 'string' &&
    isRole(user.role)
  );
};

export const isAttendanceParticipant = (
  value: unknown,
): value is AttendanceParticipantResponse => {
  if (!isRecord(value)) return false;

  return (
    isParticipantUser(value.user) &&
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
  const participants = (value as unknown as Record<string, unknown>)
    .participants;
  const plannedParticipants = (value as unknown as Record<string, unknown>)
    .plannedParticipants;

  return (
    Array.isArray(participants) &&
    participants.every(isAttendanceParticipant) &&
    (plannedParticipants === null ||
      (Array.isArray(plannedParticipants) &&
        plannedParticipants.every(isParticipantUser)))
  );
};
