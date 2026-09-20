/**
 * Logic thuần cho bộ lọc lecturer trên trang danh sách phiên (role admin).
 *
 * Tách khỏi component/hook để có thể kiểm tra bằng `node:test` mà không cần
 * DOM, và để quy tắc "không gọi API khi dữ liệu lọc không hợp lệ" được kiểm
 * chứng độc lập với React.
 */

/** Kết quả chọn lecturer trên UI: null id nghĩa là "Tất cả lecturer". */
export type SessionListScopeSelection =
  | { scope: 'all' }
  | { scope: 'created-by'; createdByUserId: number };

/** id lecturer hợp lệ: số nguyên dương (khớp guard ở API client). */
export const isValidLecturerUserId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * Quyết định phạm vi tải danh sách phiên theo lựa chọn trên UI.
 *
 * - `null` (Tất cả lecturer) → dùng `GET /v0/attendance-sessions` (toàn bộ).
 * - id hợp lệ → dùng `GET /v0/attendance-sessions/created-by?userId=...`.
 * - id không hợp lệ → trả `null`: caller KHÔNG được gọi API nào cả.
 */
export const resolveSessionListScope = (
  selectedLecturerUserId: number | null,
): SessionListScopeSelection | null => {
  if (selectedLecturerUserId === null) {
    return { scope: 'all' };
  }

  if (!isValidLecturerUserId(selectedLecturerUserId)) {
    return null;
  }

  return { scope: 'created-by', createdByUserId: selectedLecturerUserId };
};

/** Một mục trong dropdown chọn lecturer: id để gọi API, label để hiển thị. */
export type LecturerOption = {
  userId: number;
  label: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * `GET /v0/users` trả `User[]` gồm `id/code/role/fullname/...`.
 *
 * Chỉ giữ bản ghi lecturer có đủ dữ liệu hiển thị; bản ghi lỗi shape bị bỏ
 * qua thay vì làm sập dropdown.
 */
export const isLecturerUser = (
  value: unknown,
): value is { id: number; code: string; fullname: string } => {
  if (!isRecord(value)) return false;

  return (
    value.role === 'lecturer' &&
    typeof value.id === 'number' &&
    Number.isInteger(value.id) &&
    value.id > 0 &&
    typeof value.fullname === 'string' &&
    typeof value.code === 'string'
  );
};

/**
 * Lọc danh sách user từ API users thành options cho dropdown lecturer.
 *
 * - Chỉ role `lecturer` (yêu cầu của task).
 * - Dedupe theo `id`, giữ thứ tự xuất hiện (không mutate input).
 * - Label ưu tiên `fullname (code)`, fallback về phần nào còn đọc được.
 */
export const toLecturerOptions = (users: unknown): LecturerOption[] => {
  if (!Array.isArray(users)) return [];

  const seen = new Set<number>();
  const options: LecturerOption[] = [];

  for (const user of users) {
    if (!isLecturerUser(user)) continue;
    if (seen.has(user.id)) continue;

    seen.add(user.id);

    const fullname = user.fullname.trim();
    const code = user.code.trim();
    const label =
      fullname && code
        ? `${fullname} (${code})`
        : (fullname || code);

    options.push({ userId: user.id, label });
  }

  return options;
};

export type LoadTracker = {
  /** Mở một request mới, trả về id của request đó. */
  begin: () => number;
  /** `true` khi request vẫn là request mới nhất, được phép ghi state. */
  isActive: (requestId: number) => boolean;
};

/**
 * Theo dõi request mới nhất để chặn stale response.
 *
 * Khi đổi lecturer, request của lecturer trước có thể hoàn thành sau request
 * mới; response cũ phải bị bỏ qua thay vì ghi đè dữ liệu của lecturer hiện
 * tại. Không dùng state React để tránh phụ thuộc vào thứ tự render.
 */
export const createLoadTracker = (): LoadTracker => {
  let latestRequestId = 0;

  return {
    begin: () => {
      latestRequestId += 1;

      return latestRequestId;
    },
    isActive: (requestId: number) => latestRequestId === requestId,
  };
};