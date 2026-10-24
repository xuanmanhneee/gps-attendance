/**
 * Logic thuần cho bộ lọc organizer trên trang danh sách phiên (role admin).
 *
 * Tách khỏi component/hook để có thể kiểm tra bằng `node:test` mà không cần
 * DOM, và để quy tắc "không gọi API khi dữ liệu lọc không hợp lệ" được kiểm
 * chứng độc lập với React.
 */

/** Kết quả chọn organizer trên UI: null id nghĩa là "Tất cả organizer". */
export type SessionListScopeSelection =
  | { scope: 'all' }
  | { scope: 'created-by'; createdByUserId: number };

/** id organizer hợp lệ: số nguyên dương (khớp guard ở API client). */
export const isValidOrganizerUserId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * Quyết định phạm vi tải danh sách phiên theo lựa chọn trên UI.
 *
 * - `null` (Tất cả organizer) → dùng `GET /v0/attendance-sessions` (toàn bộ).
 * - id hợp lệ → dùng `GET /v0/attendance-sessions/created-by?userId=...`.
 * - id không hợp lệ → trả `null`: caller KHÔNG được gọi API nào cả.
 */
export const resolveSessionListScope = (
  selectedOrganizerUserId: number | null,
): SessionListScopeSelection | null => {
  if (selectedOrganizerUserId === null) {
    return { scope: 'all' };
  }

  if (!isValidOrganizerUserId(selectedOrganizerUserId)) {
    return null;
  }

  return { scope: 'created-by', createdByUserId: selectedOrganizerUserId };
};

/** Một mục trong dropdown chọn organizer: id để gọi API, label để hiển thị. */
export type OrganizerOption = {
  userId: number;
  label: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * `GET /v0/users` trả `User[]` gồm `id/code/role/fullname/...`.
 *
 * Chỉ giữ bản ghi organizer có đủ dữ liệu hiển thị; bản ghi lỗi shape bị bỏ
 * qua thay vì làm sập dropdown.
 */
export const isOrganizerUser = (
  value: unknown,
): value is { id: number; code: string; fullname: string } => {
  if (!isRecord(value)) return false;

  return (
    value.role === 'organizer' &&
    typeof value.id === 'number' &&
    Number.isInteger(value.id) &&
    value.id > 0 &&
    typeof value.fullname === 'string' &&
    typeof value.code === 'string'
  );
};

/**
 * Lọc danh sách user từ API users thành options cho dropdown organizer.
 *
 * - Chỉ role `organizer` (yêu cầu của task).
 * - Dedupe theo `id`, giữ thứ tự xuất hiện (không mutate input).
 * - Label ưu tiên `fullname (code)`, fallback về phần nào còn đọc được.
 */
export const toOrganizerOptions = (users: unknown): OrganizerOption[] => {
  if (!Array.isArray(users)) return [];

  const seen = new Set<number>();
  const options: OrganizerOption[] = [];

  for (const user of users) {
    if (!isOrganizerUser(user)) continue;
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
 * Khi đổi organizer, request của organizer trước có thể hoàn thành sau request
 * mới; response cũ phải bị bỏ qua thay vì ghi đè dữ liệu của organizer hiện
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