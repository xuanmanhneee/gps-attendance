import type { UserProfileDto } from '@gps-attendance/shared';

interface DashboardSidebarProps {
  user: UserProfileDto | null;
  onLogout: () => void;
}

interface NavItemProps {
  label: string;
  active?: boolean;
}

const NavItem = ({ label, active = false }: NavItemProps) => (
  <button
    type="button"
    className={`w-full px-3 py-2 rounded-lg text-left text-[13.5px] ${
      active ? 'bg-blue-600 text-white font-medium' : 'hover:bg-[#1e2130]'
    }`}
  >
    {label}
  </button>
);

const DashboardSidebar = ({ user, onLogout }: DashboardSidebarProps) => (
  <aside className="w-56 bg-[#14161f] text-gray-300 flex flex-col p-3 shrink-0">
    <div className="text-[15px] font-semibold px-2 pb-6 flex items-center gap-2">
      GPS Attendance
    </div>

    <nav className="flex flex-col gap-0.5" aria-label="Điều hướng chính">
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
        onClick={onLogout}
      >
        Đăng xuất
      </button>
    </div>
  </aside>
);

export default DashboardSidebar;
