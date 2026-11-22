import { Navigate, Route, Routes } from 'react-router-dom';
import { AsyncState } from '../components/async-state';
import { AttendanceSummaryPage } from '../features/attendance/attendance-summary-page';
import { CreateSessionPage } from '../features/attendance/create-session-page';
import { SessionPage } from '../features/attendance/session-page';
import { LoginPage } from '../features/auth/login-page';
import { CourseDetailPage } from '../features/courses/course-detail-page';
import { CoursesPage } from '../features/courses/courses-page';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { IntegrationPage } from '../features/integration/integration-page';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';

export function AppRouter() {
  const { user, loading } = useAuth();
  if (loading) return <div className="fullscreen-state"><AsyncState kind="loading" message="Đang khôi phục phiên đăng nhập…" /></div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:classId" element={<CourseDetailPage />} />
        <Route path="courses/:classId/report" element={<AttendanceSummaryPage />} />
        <Route path="courses/:classId/create-session" element={<CreateSessionPage />} />
        <Route path="attendance/:externalId" element={<SessionPage />} />
        <Route path="integration" element={<IntegrationPage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}
