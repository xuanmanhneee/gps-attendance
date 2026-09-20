/**
 * Logic thuần cho danh sách phiên điểm danh: cập nhật bất biến và quyết định
 * state hiển thị (loading / empty / error / ready).
 */
import type { AttendanceSessionResponse } from '@gps-attendance/shared';

export const toError = (unknownError: unknown, fallback: Error): Error =>
  unknownError instanceof Error ? unknownError : fallback;

/**
 * Thêm phiên vừa tạo lên đầu danh sách mà không mutate state cũ.
 *
 * Upsert theo `id` để gọi lại (vd reload xong) không tạo duplicate.
 */
export const applySessionCreated = (
  sessions: readonly AttendanceSessionResponse[],
  created: AttendanceSessionResponse,
): AttendanceSessionResponse[] => [
  created,
  ...sessions.filter((session) => session.id !== created.id),
];

export type SessionListState = 'loading' | 'error' | 'empty' | 'ready';

export type SessionListStateInput = {
  sessionCount: number;
  isLoading: boolean;
  error: Error | null;
};

/**
 * Ưu tiên dữ liệu đã có: khi danh sách không rỗng, dữ liệu cũ vẫn được hiển thị
 * trong lúc reload và không bị thay bằng loading/error state.
 */
export const resolveSessionListState = ({
  sessionCount,
  isLoading,
  error,
}: SessionListStateInput): SessionListState => {
  if (sessionCount > 0) return 'ready';
  if (isLoading) return 'loading';
  if (error) return 'error';

  return 'empty';
};

/**
 * Lỗi reload khi vẫn còn dữ liệu: hiển thị cảnh báo kèm nút thử lại thay vì
 * xoá danh sách đang xem.
 */
export const shouldShowSessionStaleError = ({
  sessionCount,
  error,
}: Pick<SessionListStateInput, 'sessionCount' | 'error'>): boolean =>
  error !== null && sessionCount > 0;
