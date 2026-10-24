import { useRole } from '../hooks/useRole';
import { AdminOverview } from './overview/AdminOverview';
import { OrganizerOverview } from './overview/OrganizerOverview';

/**
 * Cổng vào `/dashboard`: render overview theo vai trò của tài khoản đã xác thực.
 */
const DashboardPage = () => {
  const role = useRole();

  return role === 'organizer' ? <OrganizerOverview /> : <AdminOverview />;
};

export default DashboardPage;
