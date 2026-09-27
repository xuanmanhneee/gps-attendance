import { useNavigate } from 'react-router-dom';
import { CreateSessionModal } from '../components/CreateSessionModal';
import DashboardSidebar from '../components/DashboardSidebar';
import SessionTable from '../components/SessionTable';
import { useAuth } from '../hooks/useAuth';
import { useAttendanceSessions } from '../hooks/useAttendanceSessions';
import { useState } from 'react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { sessions, isLoading, createSession, closeSession, deleteSession } =
    useAttendanceSessions();

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
