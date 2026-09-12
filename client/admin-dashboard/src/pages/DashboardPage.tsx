import { useNavigate } from 'react-router-dom';
import { CreateSessionModal } from '../components/CreateSessionModal';
import DashboardSidebar from '../components/DashboardSidebar';
import SessionTable from '../components/SessionTable';
import { useAuth } from '../hooks/useAuth';
import { useAttendanceSessions } from '../hooks/useAttendanceSessions';
import { useState } from 'react';

<<<<<<< HEAD
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

=======
>>>>>>> origin/main
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
      <DashboardSidebar user={user} onLogout={handleLogout} />

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

        <SessionTable sessions={sessions} isLoading={isLoading} />
      </main>
    </div>
  );
};

export default DashboardPage;
