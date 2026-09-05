import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CreateSessionModal } from '../components/CreateSessionModal';

//mock data
// const sessions = [
//   {
//     className: "Lập trình Web",
//     time: "07:00 - 09:00, Thứ 2",
//     checkedIn: "39/48",
//     status: "active",
//   },
//   {
//     className: "Cơ sở dữ liệu",
//     time: "13:00 - 15:00, Thứ 3",
//     checkedIn: "0/45",
//     status: "upcoming",
//   },
//   {
//     className: "Mạng máy tính",
//     time: "07:00 - 09:00, Thứ 2 tuần trước",
//     checkedIn: "42/44",
//     status: "closed",
//   },
// ];

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

// const StatCard = ({
//   label,
//   value,
//   color = 'text-gray-900',
// }: {
//   label: string;
//   value: string;
//   color?: string;
// }) => {
//   return (
//     <div className="bg-white border border-gray-200 rounded-xl p-4">
//       <p className="text-[12.5px] text-gray-500 mb-1.5">{label}</p>
//       <p className={`text-2xl font-semibold ${color}`}>{value}</p>
//     </div>
//   );
// };

//Function

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);

        console.log('dashboard data:');
      } catch (error) {
        console.error('Fetch dashboard failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);
  if (loading) return <div>Đang tải...</div>;

  const handleLogout = () => {
    // thêm logic xóa token khi đăng xuất vào đây
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
              NA
            </div>
            Nguyễn Văn A (GV)
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
        />

        {/* Stat cards
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Tổng sinh viên" value="" />
          <StatCard label="Đã điểm danh" value="" color="text-green-600" />
          <StatCard label="Nghi ngờ gian lận" value="" color="text-amber-600" />
          <StatCard label="Chưa điểm danh" value="" color="text-gray-400" />
        </div> */}
        {/* Table */}
      </main>
    </div>
  );
};

export default DashboardPage;
