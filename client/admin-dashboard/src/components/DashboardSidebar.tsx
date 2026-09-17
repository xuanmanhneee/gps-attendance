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
// import type { UserProfileDto } from '@gps-attendance/shared';
// import {
//   MdBarChart,
//   MdCalendarToday,
//   MdGroups,
//   MdLogout,
//   MdSettings,
// } from 'react-icons/md';

// interface DashboardSidebarProps {
//   user: UserProfileDto | null;
//   onLogout: () => void;
// }

// interface NavItemProps {
//   label: string;
//   icon: React.ReactNode;
//   active?: boolean;
// }

// const NavItem = ({ label, icon, active = false }: NavItemProps) => (
//   <button
//     type="button"
//     className={`group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition md:w-full md:gap-3 ${
//       active
//         ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-950/20'
//         : 'text-slate-400 hover:bg-white/5 hover:text-white'
//     }`}
//   >
//     <span
//       className={
//         active ? 'text-white' : 'text-slate-500 group-hover:text-blue-300'
//       }
//     >
//       {icon}
//     </span>
//     {label}
//   </button>
// );

// const DashboardSidebar = ({ user, onLogout }: DashboardSidebarProps) => (
//   <aside className="flex w-full shrink-0 flex-col bg-[#111827] p-3 text-gray-300 md:h-screen md:w-64 md:p-4">
//     <div className="flex items-center gap-3 px-2 pb-4 pt-1 md:pb-8">
//       <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
//         GPS
//       </div>
//       <div>
//         <div className="text-[15px] font-semibold tracking-tight text-white">
//           GPS Attendance
//         </div>
//         <div className="text-[11px] text-slate-500">Admin workspace</div>
//       </div>
//     </div>

//     <nav
//       className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-col md:overflow-visible"
//       aria-label="Điều hướng chính"
//     >
//       <NavItem
//         label="Phiên điểm danh"
//         icon={<MdCalendarToday size={18} />}
//         active
//       />
//       <NavItem label="Thống kê" icon={<MdBarChart size={18} />} />
//       <NavItem label="Sinh viên" icon={<MdGroups size={18} />} />
//       <NavItem label="Cài đặt" icon={<MdSettings size={18} />} />
//     </nav>

//     <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm md:mt-auto md:flex-col md:items-stretch md:pt-4">
//       <div className="flex items-center gap-3 px-1">
//         <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-200 ring-1 ring-blue-400/20">
//           {user?.fullname?.charAt(0).toUpperCase()}
//         </div>

//         <div className="min-w-0">
//           <div className="font-medium text-slate-200">{user?.fullname}</div>
//           <div className="text-xs text-slate-500">
//             {user?.role === 'admin' ? 'Quản trị viên' : 'Giảng viên'}
//           </div>
//         </div>
//       </div>

//       <button
//         type="button"
//         className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500 hover:text-white md:w-full"
//         onClick={onLogout}
//       >
//         <MdLogout size={17} />
//         Đăng xuất
//       </button>
//     </div>
//   </aside>
// );

// export default DashboardSidebar;
