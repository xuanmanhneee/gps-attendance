// Logic thuần cho màn duyệt review. Type khai báo cục bộ theo contract của server Attendance.

export type ValidationReason =
  | 'LOW_CONFIDENCE_SCORE'
  | 'MOCK_LOCATION'
  | 'OUT_OF_RANGE'
  | 'INVALID_LOCATION_TIMESTAMP';
export type ReviewDecision = 'approve' | 'reject';
export type ReviewRole = 'admin' | 'organizer' | 'participant';

export type ReviewCandidate = {
  sessionId: number;
  userId: number;
  student: { code: string; fullname: string; role: ReviewRole };
  reasons: ValidationReason[];
};
export type ReviewHistoryItem = {
  id: string;
  session: { id: number; title: string };
  student: { code: string; fullname: string; role: ReviewRole };
  decision: ReviewDecision;
  reasons: ValidationReason[];
  reason: string | null;
  resolvedAt: string;
};
export type OwnSession = {
  id: number;
  title: string;
  openAt: string;
  closeAt: string;
  status: string;
};

export const MAX_REASON_LENGTH = 500;
// Cửa sổ chốt: từ openAt đến closeAt + 10 phút (server là nơi quyết định; đây chỉ để hiển thị).
export const REVIEW_RESOLUTION_GRACE_MS = 10 * 60 * 1000;

export const REASON_LABELS: Record<ValidationReason, string> = {
  LOW_CONFIDENCE_SCORE: 'Độ tin cậy thấp',
  MOCK_LOCATION: 'Nghi ngờ vị trí giả lập',
  OUT_OF_RANGE: 'Ngoài phạm vi cho phép',
  INVALID_LOCATION_TIMESTAMP: 'Mốc thời gian vị trí không hợp lệ',
};
const REASONS = Object.keys(REASON_LABELS);
const ROLES = ['admin', 'organizer', 'participant'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;
const isPositiveId = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const isStudent = (v: unknown): v is ReviewCandidate['student'] =>
  isRecord(v) &&
  typeof v.code === 'string' &&
  typeof v.fullname === 'string' &&
  typeof v.role === 'string' &&
  ROLES.includes(v.role);
const isReasonList = (v: unknown): v is ValidationReason[] =>
  Array.isArray(v) && v.every((r) => typeof r === 'string' && REASONS.includes(r));

export const isReviewCandidate = (v: unknown): v is ReviewCandidate =>
  isRecord(v) &&
  isPositiveId(v.sessionId) &&
  isPositiveId(v.userId) &&
  isStudent(v.student) &&
  isReasonList(v.reasons) &&
  v.reasons.length > 0;

export const isHistoryItem = (v: unknown): v is ReviewHistoryItem =>
  isRecord(v) &&
  typeof v.id === 'string' &&
  isRecord(v.session) &&
  isPositiveId(v.session.id) &&
  typeof v.session.title === 'string' &&
  isStudent(v.student) &&
  (v.decision === 'approve' || v.decision === 'reject') &&
  isReasonList(v.reasons) &&
  (v.reason === null || typeof v.reason === 'string') &&
  typeof v.resolvedAt === 'string' &&
  Number.isFinite(Date.parse(v.resolvedAt));

export const isOwnSession = (v: unknown): v is OwnSession =>
  isRecord(v) &&
  isPositiveId(v.id) &&
  typeof v.title === 'string' &&
  typeof v.openAt === 'string' &&
  typeof v.closeAt === 'string' &&
  typeof v.status === 'string';

/** null nếu không phải mảng (lỗi hợp đồng); item sai shape bị bỏ và đếm lại. */
export const parseList = <T>(
  value: unknown,
  guard: (v: unknown) => v is T,
): { items: T[]; dropped: number } | null => {
  if (!Array.isArray(value)) return null;
  const items = value.filter(guard);
  return { items, dropped: value.length - items.length };
};

export type ResolutionState = 'not-open' | 'open' | 'closed';
export const getResolutionState = (
  openAt: string,
  closeAt: string,
  nowMs = Date.now(),
): ResolutionState => {
  const open = new Date(openAt).getTime();
  const close = new Date(closeAt).getTime();
  if (!Number.isFinite(open) || !Number.isFinite(close)) return 'closed';
  if (nowMs < open) return 'not-open';
  if (nowMs > close + REVIEW_RESOLUTION_GRACE_MS) return 'closed';
  return 'open';
};

export const RESOLUTION_LABELS: Record<ResolutionState, string> = {
  'not-open': 'Phiên chưa mở: chưa thể chốt yêu cầu.',
  open: 'Đang trong thời gian chốt yêu cầu.',
  closed: 'Đã ngoài thời gian chốt (đóng phiên + 10 phút).',
};

export const normalizeReason = (text: string): string => text.trim();
export const isReasonTooLong = (text: string): boolean =>
  normalizeReason(text).length > MAX_REASON_LENGTH;

/** Body PATCH: chỉ gửi reason khi có nội dung sau khi trim. */
export const buildResolveBody = (decision: ReviewDecision, reason: string) => {
  const text = normalizeReason(reason);
  return text ? { decision, reason: text } : { decision };
};

export const removeCandidate = (
  items: readonly ReviewCandidate[],
  userId: number,
): ReviewCandidate[] => items.filter((c) => c.userId !== userId);

/** Bóc JWT khi người dùng dán nhầm cả "Bearer " hoặc có khoảng trắng/xuống dòng. */
export const normalizeToken = (raw: string): string =>
  raw.trim().replace(/^Bearer\s+/i, '').replace(/\s+/g, '');
