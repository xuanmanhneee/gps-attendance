import { Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { ROUTE_PATHS } from '../../routes/paths';
import DashboardSidebar from '../DashboardSidebar';
import { Topbar } from './Topbar';

/**
 * Khung layout của dashboard: sidebar cố định, topbar và vùng nội dung scroll.
 */
export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTE_PATHS.login, { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar user={user} onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-6 pb-10 md:px-6 md:pt-[34px] md:pb-[42px] lg:px-[38px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};