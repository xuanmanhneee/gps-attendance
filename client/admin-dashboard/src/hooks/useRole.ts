import { useAuth } from './useAuth';
import { resolveUserRole } from '../types/user-role';
import type { UserRole } from '../types/user-role';

/**
 * Vai trò của tài khoản đã xác thực, dùng để render menu và dashboard.
 *
 * Read-only và không giữ state riêng: giá trị được suy ra trực tiếp từ auth
 * context nên refresh không thể biến nó thành một role giả trong localStorage.
 */
export const useRole = (): UserRole => {
  const { user } = useAuth();

  return resolveUserRole(user?.role);
};