import { useNavigate } from 'react-router-dom';
import { CreateSessionModal } from '../components/CreateSessionModal';
import { useAuth } from '../hooks/useAuth';
import { useAttendanceSessions } from '../hooks/useAttendanceSessions';
import { useState } from 'react';

import type { SessionStatus } from '@gps-attendance/shared';

const statusBadge: Record<SessionStatus, string> = {
  open: 'bg-green-100 text-green-600',
  pending: 'bg-gray-100 text-gray-500',
  closed: 'bg-gray-100 text-gray-400',
};

const statusLabel: Record<SessionStatus, string> = {
  open: 'Đang diễn ra',
  pending: 'Sắp diễn ra',
  closed: 'Đã kết thúc',
};

const NavItem = ({ label, active }: { label: string; active?: boolean }) => {
  return (
    <div
      className={`px-3 py-2 rounded-lg text-[13.5px] cursor-pointer ${
        active ? 'bg-blue-600 text-white font-medium' : 'hover:bg-[#1e2130]'
      }`}
    >
      {label}
    </div>
  );
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { sessions, isLoading, createSession } = useAttendanceSessions();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-56 bg-[#14161f] text-gray-300 flex flex-col p-3 flex-shrink-0">
        <div className="text-[15px] font-semibold px-2 pb-6 flex items-center gap-2">
          GPS Attendance
        </div>

        <nav className="flex flex-col gap-0.5">
          <NavItem label="Phiên điểm danh" active />
          <NavItem label="Thống kê" />
          <NavItem label="Sinh viên" />
          <NavItem label="Cài đặt" />
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-700 text-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-semibold text-white">
              {user?.fullname?.charAt(0).toUpperCase()}
            </div>

            <div>
              <div>{user?.fullname}</div>
              <div className="text-xs text-gray-500">
                {user?.role === 'admin' ? 'Quản trị viên' : 'Giảng viên'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500 hover:text-white"
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
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

        {/* Table */}
        {isLoading ? (
          <p className="text-sm text-gray-500">Đang tải danh sách...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Chưa có phiên điểm danh nào. Nhấn "Tạo phiên mới" để bắt đầu.
          </p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tên phiên</th>
                  <th className="px-4 py-2.5 font-medium">Thời gian</th>
                  <th className="px-4 py-2.5 font-medium">Bán kính</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 font-medium">{session.title}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {formatDateTime(session.openAt)} –{' '}
                      {formatDateTime(session.closeAt)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {session.radius}m
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[session.status]}`}
                      >
                        {statusLabel[session.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
