import { useNavigate } from 'react-router-dom';
import { CreateSessionModal } from '../components/CreateSessionModal';
import DashboardSidebar from '../components/DashboardSidebar';
import SessionTable from '../components/SessionTable';
import { useAuth } from '../hooks/useAuth';
import { useAttendanceSessions } from '../hooks/useAttendanceSessions';
import { useEffect, useState } from 'react';
import type { LecturerAttendanceAnalytics } from '@gps-attendance/shared';
import { attendanceSessionsApi } from '../api/attendance-sessions.api';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<LecturerAttendanceAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const { sessions, isLoading, createSession, closeSession, deleteSession } =
    useAttendanceSessions();
  const atRiskStudents = Array.isArray(analytics?.atRiskStudents)
    ? analytics.atRiskStudents
    : [];

  useEffect(() => {
    attendanceSessionsApi
      .getAnalytics()
      .then(setAnalytics)
      .catch(() => setAnalyticsError('Không thể tải thống kê chuyên cần.'));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      <DashboardSidebar user={user} onLogout={handleLogout} />

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {analyticsError && (
          <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {analyticsError}
          </p>
        )}
        {analytics && (
          <section aria-label="Thống kê chuyên cần" className="mb-8 space-y-4">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              {[
                ['Tỷ lệ chuyên cần', `${analytics.attendanceRate}%`],
                ['Sinh viên', analytics.totalStudents],
                ['Buổi học', analytics.totalSessions],
                ['Vắng', analytics.absentCount],
                ['Chờ xem xét', analytics.reviewCount],
              ].map(([label, value]) => (
                <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                </article>
              ))}
            </div>

            {atRiskStudents.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
                <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
                  <h2 className="text-sm font-semibold text-amber-900">Sinh viên có buổi vắng cần theo dõi</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {atRiskStudents.map((student) => (
                    <div key={student.userId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div>
                        <span className="font-medium text-slate-900">{student.fullname}</span>
                        <span className="ml-2 font-mono text-xs text-slate-500">{student.userCode}</span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Vắng {student.absentCount}/{student.totalSessions} buổi · Chuyên cần {student.attendanceRate}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-semibold">Danh sách phiên điểm danh</h1>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Tạo phiên mới
          </button>
        </div>

        <CreateSessionModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmitSuccess={async (data) => {
            await createSession(data);
            setIsCreateModalOpen(false);
          }}
        />

        <SessionTable
          sessions={sessions}
          isLoading={isLoading}
          onDelete={deleteSession}
          onCloseSession={closeSession}
          onCreateNew={() => setIsCreateModalOpen(true)}
        />
      </main>
    </div>
  );
};

export default DashboardPage;
