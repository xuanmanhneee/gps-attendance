import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FaLock, FaMoon, FaRegEyeSlash, FaSun } from 'react-icons/fa';
import { FaRegEye } from 'react-icons/fa6';
import { RiAccountCircleFill } from 'react-icons/ri';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import { ApiError, AuthErrorCode } from '@gps-attendance/shared';
import type { LoginRequest } from '@gps-attendance/shared';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { ROUTE_PATHS } from '../routes/paths';
import { toggleResolvedTheme } from '../types/theme';

const LoginPage = () => {
  const navigate = useNavigate();
  const { resolvedTheme, setMode } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const togglePasswordView = () => setShowPassword(!showPassword);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const { login, isLoading } = useAuth();

  const handleLogin = async (data: LoginRequest) => {
    // Lấy lỗi từ backend theo error code thay vì hard-code cùng một chuỗi ở
    // nhiều component.
    const loginErrorMessages: Partial<Record<string, string>> = {
      [AuthErrorCode.INVALID_CREDENTIALS]: 'Sai username hoặc password',
      [AuthErrorCode.ACCOUNT_NOT_LINKED]: 'Tài khoản chưa được liên kết',
      [AuthErrorCode.ROLE_NOT_ALLOWED]: 'Bạn không có quyền truy cập',
    };

    try {
      await login(data);

      toast.success('Đăng nhập thành công!');

      navigate(ROUTE_PATHS.overview, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const message = error.code
          ? loginErrorMessages[error.code]
          : undefined;

        toast.error(message ?? error.message);
        return;
      }

      toast.error('Đăng nhập thất bại');
    }
  };

  return (
    <main
      className={`relative flex min-h-screen w-full flex-col items-center overflow-hidden px-4 pb-8 pt-6 ${
        isDark
          ? 'bg-[#101820] text-slate-100'
          : 'bg-[#f7f8f5] text-[#566168]'
      }`}
      style={{
        fontFamily:
          "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(135deg, transparent 0 24%, rgba(255,255,255,.025) 24.1% 36%, transparent 36.1% 52%, rgba(255,255,255,.02) 52.1% 63%, transparent 63.1%)'
            : 'linear-gradient(135deg, transparent 0 24%, rgba(216,221,215,.28) 24.1% 36%, transparent 36.1% 52%, rgba(216,221,215,.22) 52.1% 63%, transparent 63.1%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-[500px] justify-end">
        <button
          type="button"
          onClick={() => setMode(toggleResolvedTheme(resolvedTheme))}
          aria-label="Giao diện tối"
          aria-pressed={isDark}
          title={`Chuyển sang giao diện ${isDark ? 'sáng' : 'tối'}`}
          className={`flex h-10 w-10 items-center justify-center border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            isDark
              ? 'border-slate-600 bg-[#1d2932] text-amber-300 hover:bg-[#27343e]'
              : 'border-[#d3dbe5] bg-white text-[#548000] hover:bg-[#f1f4ec]'
          }`}
        >
          {isDark ? (
            <FaSun aria-hidden="true" />
          ) : (
            <FaMoon aria-hidden="true" />
          )}
        </button>
      </div>

      <header className="relative z-10 mt-1 flex items-center justify-center gap-4 text-center">
        <div
          aria-hidden="true"
          className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border-2 border-[#ed7b31] bg-[#fbfff4] text-[15px] font-bold text-[#5d8b12] shadow-[inset_0_0_0_4px_rgba(237,123,49,0.08)]"
        >
          DLU
        </div>
        <div className="text-left">
          <div className="text-[17px] font-bold leading-tight text-[#558000]">
            TRƯỜNG ĐẠI HỌC ĐÀ LẠT
          </div>
          <div className="text-[12px] font-bold leading-tight text-[#737373]">
            DALAT UNIVERSITY
          </div>
          <div className="mt-1.5 text-[14px] font-bold leading-tight text-[#c45d1c]">
            HỆ THỐNG QUẢN LÝ ĐIỂM DANH GPS
          </div>
        </div>
      </header>

      <section className="relative z-10 mt-8 flex w-full max-w-[500px] flex-col items-center">
        <h1
          className={`mb-4 text-center text-[25px] font-bold leading-tight ${
            isDark ? 'text-slate-200' : 'text-[#5d666b]'
          }`}
        >
          Hệ thống điểm danh GPS Trường Đại học Đà Lạt
        </h1>

        <form
          className={`w-full border border-black/[0.04] p-5 shadow-sm ${
            isDark
              ? 'bg-[#1d2932] text-slate-100'
              : 'bg-[#eeeeee] text-[#5c6266]'
          }`}
          onSubmit={handleSubmit(handleLogin)}
          noValidate
          autoComplete="on"
        >
          <header className="mb-4 text-center">
            <h2 className="text-[18px] font-bold leading-tight">
              Đăng nhập tài khoản
            </h2>
            <p
              className={`mt-1 text-[12px] ${
                isDark ? 'text-slate-300' : 'text-[#73797d]'
              }`}
            >
              Chào mừng bạn trở lại! Nhập thông tin để vào hệ thống.
            </p>
          </header>

          <div className="mb-3.5">
            <label
              htmlFor="username"
              className="mb-1.5 block text-[12px] font-semibold"
            >
              Tài khoản
            </label>
            <div className="relative flex items-center">
              <RiAccountCircleFill
                aria-hidden="true"
                className="pointer-events-none absolute left-4 h-4 w-4 text-slate-500"
              />
              <input
                id="username"
                type="text"
                placeholder="Nhập tên đăng nhập hoặc MSSV"
                autoComplete="username"
                aria-invalid={Boolean(errors.username)}
                aria-describedby={
                  errors.username ? 'username-error' : undefined
                }
                {...register('username', {
                  required: 'Vui lòng nhập Username',
                })}
                className={`h-10 w-full border px-10 text-[13px] outline-none transition-colors placeholder:text-[#818991] focus:border-[#9ab5d8] focus:ring-1 focus:ring-[#c5d6ed] ${
                  isDark
                    ? 'border-slate-600 bg-[#27343e] text-slate-100'
                    : 'border-[#d3dbe5] bg-[#f8f9fb] text-[#4d5963]'
                }`}
              />
            </div>
            {errors.username && (
              <p
                id="username-error"
                className="mt-1 text-xs font-medium text-red-600"
                role="alert"
              >
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-1.5 block text-[12px] font-semibold"
            >
              Mật khẩu
            </label>
            <div className="relative flex items-center">
              <FaLock
                aria-hidden="true"
                className="pointer-events-none absolute left-4 h-3.5 w-3.5 text-slate-500"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                {...register('password', {
                  required: 'Vui lòng nhập Password',
                })}
                className={`h-10 w-full border py-2 pl-10 pr-12 text-[13px] outline-none transition-colors placeholder:text-[#818991] focus:border-[#9ab5d8] focus:ring-1 focus:ring-[#c5d6ed] ${
                  isDark
                    ? 'border-slate-600 bg-[#27343e] text-slate-100'
                    : 'border-[#d3dbe5] bg-[#f8f9fb] text-[#4d5963]'
                }`}
              />
              <button
                type="button"
                onClick={togglePasswordView}
                aria-label={
                  showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'
                }
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className={`absolute right-2 flex h-8 w-8 items-center justify-center ${
                  isDark
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {showPassword ? (
                  <FaRegEye aria-hidden="true" />
                ) : (
                  <FaRegEyeSlash aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                className="mt-1 text-xs font-medium text-red-600"
                role="alert"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-[38px] w-full items-center justify-center gap-2 bg-[#548000] px-4 text-[14px] font-bold text-white transition-colors hover:enabled:bg-[#456b00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#548000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div className="my-3.5 flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`h-px flex-1 ${
                isDark ? 'bg-slate-600' : 'bg-[#d5d9d5]'
              }`}
            />
            <span className="text-[11px] font-semibold uppercase">
              Hoặc đăng nhập bằng
            </span>
            <span
              aria-hidden="true"
              className={`h-px flex-1 ${
                isDark ? 'bg-slate-600' : 'bg-[#d5d9d5]'
              }`}
            />
          </div>

          <div
            className={`flex h-[40px] items-center justify-center gap-2 border bg-white text-[12px] font-semibold text-[#4d5358] ${
              isDark ? 'border-slate-600' : 'border-[#d8d8d8]'
            }`}
          >
            <img
              src="/google-icon.png"
              alt=""
              aria-hidden="true"
              className="h-[18px] w-[18px]"
            />
            <span>Tiếp tục với Google (@dlu.edu.vn)</span>
          </div>
        </form>

        <footer
          className={`mt-4 text-center text-[11px] leading-[1.7] ${
            isDark ? 'text-slate-400' : 'text-[#929ba0]'
          }`}
        >
          <div>© 2026 Trường Đại học Đà Lạt. Bản quyền thuộc về DLU.</div>
          <div>
            Trung tâm CNTT &amp; Thư viện số • Hệ thống điểm danh GPS v2.4.0
          </div>
        </footer>
      </section>
    </main>
  );
};

export default LoginPage;
