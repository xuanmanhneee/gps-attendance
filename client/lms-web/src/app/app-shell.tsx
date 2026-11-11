import { useState } from 'react';
import { FiBookOpen, FiGrid, FiLogOut, FiMenu, FiRefreshCw, FiX } from 'react-icons/fi';
import { NavLink, Outlet } from 'react-router-dom';
import logoUrl from '../../../mobile-client/assets/images/logo-dlu.png';
import { useAuth } from './auth-provider';

const navigation = [
  { to: '/', label: 'Tổng quan', icon: FiGrid, end: true },
  { to: '/courses', label: 'Lớp học', icon: FiBookOpen },
  { to: '/integration', label: 'Tích hợp', icon: FiRefreshCw },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) return null;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="brand"><img src={logoUrl} alt="" /><div><b>DLU LMS</b><span>Academic Portal</span></div></div>
        <button className="sidebar__close" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><FiX /></button>
        <nav aria-label="Điều hướng chính">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink to={to} end={end} key={to} onClick={() => setMenuOpen(false)}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__profile"><span>{user.role === 'admin' ? 'Quản trị viên' : 'Giảng viên'}</span><b>{user.fullname}</b><small>{user.code} · {user.unitCode}</small></div>
      </aside>
      {menuOpen && <button className="sidebar-backdrop" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <div className="app-main">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><FiMenu /></button>
          <div><b>Trường Đại học Đà Lạt</b><span>Hệ thống học tập trực tuyến</span></div>
          <div className="topbar__user"><span className="avatar">{user.fullname.trim().split(' ').at(-1)?.[0]}</span><div><b>{user.fullname}</b><span>{user.code}</span></div><button className="icon-button" aria-label="Đăng xuất" title="Đăng xuất" onClick={() => void logout()}><FiLogOut /></button></div>
        </header>
        <main className="workspace"><Outlet /></main>
      </div>
    </div>
  );
}
