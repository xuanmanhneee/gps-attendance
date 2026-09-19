import { Navigate, Route, Routes } from 'react-router-dom';

import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LoadingState } from '../components/ui/DataState';
import AttendanceRecordsPage from '../pages/AttendanceRecordsPage';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import SessionDetailPage from '../pages/SessionDetailPage';
import SessionsPage from '../pages/SessionsPage';
import StatisticsPage from '../pages/StatisticsPage';
import TagsPage from '../pages/TagsPage';
import UnitsPage from '../pages/UnitsPage';
import UsersPage from '../pages/UsersPage';
import { useAuth } from '../hooks/useAuth';
import ProtectedRoute from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { ROUTE_PATHS } from './paths';

/** `/` đưa người dùng tới dashboard nếu đã đăng nhập, ngược lại về login. */
const LandingRedirect = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <Navigate
      to={user ? ROUTE_PATHS.overview : ROUTE_PATHS.login}
      replace
    />
  );
};

const AppRoutes = () => (
  <Routes>
    <Route path={ROUTE_PATHS.login} element={<LoginPage />} />

    <Route element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path={ROUTE_PATHS.overview} element={<DashboardPage />} />

        <Route element={<RoleGuard allowedRoles={['admin']} />}>
          <Route path={ROUTE_PATHS.users} element={<UsersPage />} />
          <Route path={ROUTE_PATHS.units} element={<UnitsPage />} />
          <Route path={ROUTE_PATHS.tags} element={<TagsPage />} />
        </Route>

        <Route element={<RoleGuard allowedRoles={['lecturer']} />}>
          <Route
            path={ROUTE_PATHS.attendanceSessions}
            element={<SessionsPage />}
          />
          <Route
            path={ROUTE_PATHS.attendanceSessionDetail}
            element={<SessionDetailPage />}
          />
          <Route
            path={ROUTE_PATHS.attendanceRecords}
            element={<AttendanceRecordsPage />}
          />
          <Route
            path={ROUTE_PATHS.statistics}
            element={<StatisticsPage />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>

    <Route path="/" element={<LandingRedirect />} />
  </Routes>
);

export default AppRoutes;