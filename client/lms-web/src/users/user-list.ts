// Logic thuần cho trang danh sách người dùng (nguồn: GET /v0/users của Attendance).
// Viết lại cục bộ, không import @gps-attendance/shared.

export const ROLES = ['admin', 'organizer', 'participant'] as const;
export type Role = (typeof ROLES)[number];
export type UserRoleFilter = 'all' | Role;

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên',
  organizer: 'Giảng viên / Organizer',
  participant: 'Người tham gia',
};

export const USER_PAGE_SIZE = 50;

export type UserListItem = {
  id: number;
  code: string;
  role: Role;
  unitId: number;
  fullname: string;
  createdAt: string;
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;
const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

export const isUserListItem = (value: unknown): value is UserListItem =>
  isRecord(value) &&
  isPositiveInteger(value.id) &&
  typeof value.code === 'string' &&
  isRole(value.role) &&
  isPositiveInteger(value.unitId) &&
  typeof value.fullname === 'string' &&
  typeof value.createdAt === 'string' &&
  typeof value.updatedAt === 'string';

/** null khi payload không phải mảng (coi là lỗi, không phải "rỗng"); item sai shape bị bỏ và đếm lại. */
export const parseUserList = (
  value: unknown,
): { users: UserListItem[]; dropped: number } | null => {
  if (!Array.isArray(value)) return null;
  const users = value.filter(isUserListItem);
  return { users, dropped: value.length - users.length };
};

/** Server chưa hỗ trợ lọc/phân trang nên lọc phía client; không mutate danh sách gốc. */
export const filterUsers = (
  users: readonly UserListItem[],
  query: string,
  roleFilter: UserRoleFilter,
): UserListItem[] => {
  const needle = query.trim().toLocaleLowerCase();
  return users.filter((user) => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (!needle) return true;
    return [user.code, user.fullname].some((value) =>
      value.toLocaleLowerCase().includes(needle),
    );
  });
};

export const summarizeUsersByRole = (users: readonly UserListItem[]) => {
  const summary = { total: 0, admin: 0, organizer: 0, participant: 0 };
  for (const user of users) {
    summary.total += 1;
    summary[user.role] += 1;
  }
  return summary;
};

export type Page<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
};

/** Trang bắt đầu từ 1; page ngoài khoảng được kẹp về trang hợp lệ gần nhất. */
export const paginate = <T>(
  items: readonly T[],
  page: number,
  pageSize = USER_PAGE_SIZE,
): Page<T> => {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(
    Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1),
    pageCount,
  );
  const start = (safe - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page: safe,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
  };
};
