import { useState, type FormEvent } from 'react';
import { FiEye, FiEyeOff, FiLogIn } from 'react-icons/fi';
import logoUrl from '../../../../mobile-client/assets/images/logo-dlu.png';
import { useAuth } from '../../app/auth-provider';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('gv001');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try { await login(username, password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập'); }
    finally { setLoading(false); }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="brand brand--light"><img src={logoUrl} alt="Logo Đại học Đà Lạt" /><div><b>DLU LMS</b><span>Academic Portal</span></div></div>
        <div><p>Hệ thống học tập trực tuyến</p><h1>Quản lý lớp học và điểm danh tại một nơi.</h1><span>Không gian làm việc dành cho giảng viên và quản trị viên Đại học Đà Lạt.</span></div>
      </section>
      <form className="login-card" onSubmit={(event) => void submit(event)}>
        <div><p className="eyebrow">Đăng nhập hệ thống</p><h2>Chào mừng trở lại</h2><span>Sử dụng tài khoản LMS được cấp để tiếp tục.</span></div>
        <label>Tên đăng nhập<input required autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>Mật khẩu<div className="password-field"><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></div></label>
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <button className="button button--primary button--large" disabled={loading}>{loading ? 'Đang đăng nhập…' : <><FiLogIn /> Đăng nhập</>}</button>
        <small>Tài khoản demo: <b>gv001</b> / <b>demo123</b></small>
      </form>
    </main>
  );
}
