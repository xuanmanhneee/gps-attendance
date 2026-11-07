import { Navigate, Outlet } from 'react-router-dom';

import { DEFAULT_ROUTE_BY_ROLE } from '../config/navigation';
import { useRole } from '../hooks/useRole';
import type { UserRole } from '../types/user-role';

type RoleGuardProps = {
  allowedRoles: readonly UserRole[];
};

/**
 * Chặn route theo vai trò của tài khoản đã xác thực.
 *
 * Route không thuộc role sẽ điều hướng về overview của role đó, nên URL luôn
 * khớp với quyền thật kể cả khi vào bằng deep link hoặc refresh. Đây là lớp UX
 * phía client; backend vẫn là nơi quyết định quyền thật.
 */
export const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
  const role = useRole();

  if (!allowedRoles.includes(role)) {
    return <Navigate to={DEFAULT_ROUTE_BY_ROLE[role]} replace />;
  }

  return <Outlet />;
};