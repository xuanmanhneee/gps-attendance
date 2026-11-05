import { Suspense, lazy } from 'react';
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
import { getDefaultRoute } from '../config/navigation';
import { useAuth } from '../hooks/useAuth';
import ProtectedRoute from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { ROUTE_PATHS } from './paths';

const SessionCreatePage = lazy(() => import('../pages/SessionCreatePage'));

/** `/` đưa người dùng tới trang chủ của vai trò nếu đã đăng nhập, ngược lại về login. */
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
      to={user ? getDefaultRoute(user.role) : ROUTE_PATHS.login}
      replace
    />
  );
};

/**
 * Chỉ admin có trang tổng quan (xem `NAVIGATION_ITEMS`). Vai trò khác gõ tay
 * hoặc mở bookmark cũ `/dashboard` sẽ được chuyển về trang mặc định của họ.
 */
const OverviewRoute = () => {
  const { user } = useAuth();

  if (user && user.role !== 'admin') {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }
  return <DashboardPage />;
};

const AppRoutes = () => (
  <Routes>
    <Route path={ROUTE_PATHS.login} element={<LoginPage />} />

    <Route element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path={ROUTE_PATHS.overview} element={<OverviewRoute />} />

        <Route element={<RoleGuard allowedRoles={['admin']} />}>
          <Route path={ROUTE_PATHS.users} element={<UsersPage />} />
          <Route path={ROUTE_PATHS.units} element={<UnitsPage />} />
          <Route path={ROUTE_PATHS.tags} element={<TagsPage />} />
        </Route>

        {/* Danh sách phiên: organizer xem của mình, admin xem toàn bộ + lọc theo organizer
            (endpoint `created-by` phía sau yêu cầu role admin). */}
        <Route element={<RoleGuard allowedRoles={['admin', 'organizer']} />}>
          <Route
            path={ROUTE_PATHS.attendanceSessions}
            element={<SessionsPage />}
          />
          <Route
            path={ROUTE_PATHS.attendanceRecords}
            element={<AttendanceRecordsPage />}
          />
          <Route path={ROUTE_PATHS.statistics} element={<StatisticsPage />} />
        </Route>

        {/* Tạo phiên: chỉ organizer được tạo (backend trả 403 cho role khác).
            Route tĩnh `/sessions/new` không phụ thuộc thứ tự khai báo vì
            react-router ưu tiên route khớp cụ thể hơn `/sessions/:id`. */}
        <Route element={<RoleGuard allowedRoles={['organizer']} />}>
          <Route
            path={ROUTE_PATHS.attendanceSessionCreate}
            element={
              <Suspense fallback={<LoadingState />}>
                <SessionCreatePage />
              </Suspense>
            }
          />
        </Route>

        {/* Chi tiết phiên: admin xem mọi phiên; organizer chỉ xem phiên do mình tạo. */}
        <Route element={<RoleGuard allowedRoles={['admin', 'organizer']} />}>
          <Route
            path={ROUTE_PATHS.attendanceSessionDetail}
            element={<SessionDetailPage />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>

    <Route path="/" element={<LandingRedirect />} />
  </Routes>
);

export default AppRoutes;
