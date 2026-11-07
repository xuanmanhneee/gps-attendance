import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { ROUTE_PATHS } from '../../routes/paths';
import { preferenceService } from '../../services/preference.service';
import DashboardSidebar from '../DashboardSidebar';
import { PageActionBarProvider } from './page-action-bar';
import { Topbar } from './Topbar';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    preferenceService.getSidebarCollapsed(),
  );

  const handleLogout = () => {
    logout();
    navigate(ROUTE_PATHS.login, { replace: true });
  };

  const handleToggleSidebar = () => {
    const nextIsCollapsed = !isSidebarCollapsed;

    setIsSidebarCollapsed(nextIsCollapsed);
    preferenceService.setSidebarCollapsed(nextIsCollapsed);
  };

  const hasSessionActionBar =
    pathname === ROUTE_PATHS.attendanceSessions ||
    pathname.startsWith(`${ROUTE_PATHS.attendanceSessions}/`);
  const hasPageActionBar = hasSessionActionBar;

  return (
    <div className="flex h-dvh overflow-hidden">
      <DashboardSidebar
        isCollapsed={isSidebarCollapsed}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        <PageActionBarProvider isVisible={hasPageActionBar}>
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        </PageActionBarProvider>
      </div>
    </div>
  );
};
