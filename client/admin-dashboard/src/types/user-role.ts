import type { Role } from '@gps-attendance/shared';

/**
 * Vai trò có thể dùng dashboard quản trị.
 *
 * `participant` chỉ dùng ở mobile client. Giá trị này là quyền của tài khoản đã
 * xác thực (read-only); backend vẫn quyết định quyền truy cập API.
 */
export type UserRole = 'admin' | 'organizer';

export const DEFAULT_USER_ROLE: UserRole = 'admin';

/**
 * Quy về `UserRole` để dashboard luôn có một shell hợp lệ.
 *
 * Backend đã chặn role không được phép ngay ở endpoint đăng nhập admin, nên
 * giá trị mặc định chỉ là lưới an toàn cho dữ liệu bất thường.
 */
export const resolveUserRole = (role: Role | null | undefined): UserRole =>
  role === 'organizer' ? 'organizer' : DEFAULT_USER_ROLE;
