// Logic thuần (không import gì) để phân loại phản hồi của server Attendance.
// Server bọc mọi phản hồi thành { success, data } hoặc { success:false, code, message }.

export type FailureKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'already-resolved'
  | 'window-closed'
  | 'rate-limited'
  | 'server'
  | 'invalid-response'
  | 'unknown';

export type ApiFailure = { kind: FailureKind; status?: number; code?: string };
export type EnvelopeResult =
  | { ok: true; data: unknown }
  | { ok: false; failure: ApiFailure };

// Mã lỗi theo docs của server (packages/shared); khai báo cục bộ, không import shared.
const KIND_BY_CODE: Record<string, FailureKind> = {
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not-found',
  TOO_MANY_REQUESTS: 'rate-limited',
  INTERNAL_ERROR: 'server',
  ATTENDANCE_SESSION_NOT_FOUND: 'not-found',
  ATTENDANCE_SESSION_FORBIDDEN: 'forbidden',
  ATTENDANCE_SESSION_INVALID_TIME_RANGE: 'window-closed',
  ATTENDANCE_REVIEW_USER_NOT_IN_SESSION: 'not-found',
  ATTENDANCE_REVIEW_ALREADY_CHECKED_IN: 'already-resolved',
  ATTENDANCE_REVIEW_RECORD_LOCKED: 'already-resolved',
  ATTENDANCE_REVIEW_CANDIDATE_NOT_FOUND: 'already-resolved',
  ATTENDANCE_REVIEW_RESOLUTION_WINDOW_CLOSED: 'window-closed',
};

const kindFromStatus = (status: number): FailureKind => {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 429) return 'rate-limited';
  if (status >= 500) return 'server';
  return 'unknown';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const parseEnvelope = (status: number, body: unknown): EnvelopeResult => {
  const ok = status >= 200 && status < 300;
  if (isRecord(body) && typeof body.success === 'boolean') {
    if (body.success && ok) return { ok: true, data: body.data };
    const code = typeof body.code === 'string' ? body.code : undefined;
    const kind =
      (code ? KIND_BY_CODE[code] : undefined) ??
      (ok ? 'invalid-response' : kindFromStatus(status));
    return { ok: false, failure: { kind, status, code } };
  }
  // Không có envelope: chấp nhận mảng/đối tượng thô nếu HTTP thành công.
  if (ok && body !== undefined && body !== null) return { ok: true, data: body };
  // 2xx nhưng thân rỗng (vd PATCH trả void) vẫn là thành công.
  if (ok && (body === undefined || body === null)) return { ok: true, data: null };
  return { ok: false, failure: { kind: kindFromStatus(status), status } };
};

export type ErrorContext = 'users' | 'list' | 'resolve' | 'history' | 'sessions';

const BASE: Record<FailureKind, string> = {
  network:
    'Không kết nối được tới máy chủ Attendance. Hãy kiểm tra máy chủ đang chạy (cổng 3000) và thử lại.',
  unauthorized: 'JWT Attendance không hợp lệ hoặc đã hết hạn. Hãy dán JWT mới.',
  forbidden:
    'Tài khoản của JWT này không có quyền (cần organizer, và là người tạo phiên).',
  'not-found': 'Không tìm thấy phiên hoặc bản ghi cần xử lý.',
  'already-resolved':
    'Yêu cầu này đã được xử lý ở nơi khác. Hàng chờ đang được cập nhật.',
  'window-closed': 'Đã ngoài thời gian chốt yêu cầu của phiên này.',
  'rate-limited': 'Thao tác quá nhanh, vui lòng thử lại sau.',
  server: 'Máy chủ Attendance đang gặp sự cố, vui lòng thử lại sau.',
  'invalid-response': 'Máy chủ trả về dữ liệu không đúng định dạng mong đợi.',
  unknown: '',
};
const FALLBACK: Record<ErrorContext, string> = {
  users: 'Không thể tải danh sách người dùng.',
  list: 'Không thể tải hàng chờ duyệt.',
  resolve: 'Không thể chốt yêu cầu. Vui lòng tải lại và thử lại.',
  history: 'Không thể tải lịch sử kiểm duyệt.',
  sessions: 'Không thể tải danh sách phiên của bạn.',
};

/** Thông báo tiếng Việt cố định; không bao giờ lộ message thô của server/Error. */
export const describeFailure = (
  failure: ApiFailure,
  context: ErrorContext,
): string => BASE[failure.kind] || FALLBACK[context];
