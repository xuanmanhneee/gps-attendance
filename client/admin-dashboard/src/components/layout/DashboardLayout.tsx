import { Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { ROUTE_PATHS } from '../../routes/paths';
import DashboardSidebar from '../DashboardSidebar';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTE_PATHS.login, { replace: true });
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <DashboardSidebar user={user} onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
