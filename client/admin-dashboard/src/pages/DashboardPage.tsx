import { useRole } from '../hooks/useRole';
import { AdminOverview } from './overview/AdminOverview';
import { LecturerOverview } from './overview/LecturerOverview';

/**
 * Cổng vào `/dashboard`: render overview theo vai trò của tài khoản đã xác thực.
 */
const DashboardPage = () => {
  const role = useRole();

  return role === 'lecturer' ? <LecturerOverview /> : <AdminOverview />;
};

export default DashboardPage;
