import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FaLock, FaMoon, FaRegEyeSlash, FaSun, FaUser } from 'react-icons/fa';
import { FaRegEye } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import { ApiError, AuthErrorCode } from '@gps-attendance/shared';
import type { LoginRequest } from '@gps-attendance/shared';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../hooks/useLocale';
import { toggleResolvedTheme } from '../types/theme';
import { ROUTE_PATHS } from '../routes/paths';

type LoginFormValues = LoginRequest & { rememberMe: boolean };

const LoginPage = () => {
  const navigate = useNavigate();
  const { resolvedTheme, setMode } = useTheme();
  const { locale, setLocale } = useLocale();
  const isDark = resolvedTheme === 'dark';
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const togglePasswordView = () => setShowPassword(!showPassword);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ defaultValues: { rememberMe: true } });

  const { login, isLoading } = useAuth();

  const handleLogin = async (data: LoginFormValues) => {
    const loginErrorMessages: Partial<Record<string, string>> = {
      [AuthErrorCode.INVALID_CREDENTIALS]: 'Sai username hoặc password',
      [AuthErrorCode.ACCOUNT_NOT_LINKED]: 'Tài khoản chưa được liên kết',
      [AuthErrorCode.ROLE_NOT_ALLOWED]: 'Bạn không có quyền truy cập',
    };

    try {
      await login(
        { username: data.username, password: data.password },
        data.rememberMe,
      );

      toast.success('Đăng nhập thành công!');
      navigate(ROUTE_PATHS.overview, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const message = error.code ? loginErrorMessages[error.code] : undefined;
        toast.error(message ?? error.message);
        return;
      }

      toast.error('Đăng nhập thất bại');
    }
  };

  return (
    <main
      className={`relative flex min-h-screen w-full flex-col items-center justify-between px-4 py-6 transition-colors duration-300 ${
        isDark
          ? 'bg-[#101711] text-[#f1f4ec]'
          : 'bg-[#f7f8f6] text-[#2d3748]'
      }`}
      style={{
        fontFamily:
          "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Background subtle geometric line pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, transparent 0 16%, rgba(120, 133, 111, 0.04) 16.1% 25%, transparent 25.1%), linear-gradient(315deg, transparent 0 70%, rgba(120, 133, 111, 0.03) 70.1% 81%, transparent 81.1%), #101711'
            : 'linear-gradient(135deg, transparent 0 16%, rgba(120, 133, 111, 0.05) 16.1% 25%, transparent 25.1%), linear-gradient(315deg, transparent 0 70%, rgba(120, 133, 111, 0.04) 70.1% 81%, transparent 81.1%), #f7f8f6',
        }}
      />

      {/* Top Utilities (Theme Toggle & Language) */}
      <div className="relative z-10 flex w-full max-w-[500px] justify-end items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode(toggleResolvedTheme(resolvedTheme))}
          aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          title={`Chuyển sang giao diện ${isDark ? 'sáng' : 'tối'}`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm cursor-pointer ${
            isDark
              ? 'border-[#2d3a2b] bg-[#1a2219] text-[#e0e8db] hover:bg-[#222c21] hover:border-[#3c4e3a]'
              : 'border-[#cbd5e1] bg-white text-[#475569] hover:bg-slate-50 hover:border-[#94a3b8]'
          }`}
        >
          {isDark ? (
            <>
              <FaSun className="text-amber-400 text-xs shrink-0" aria-hidden="true" />
              <span>Chế độ sáng</span>
            </>
          ) : (
            <>
              <FaMoon className="text-slate-600 text-xs shrink-0" aria-hidden="true" />
              <span>Chế độ tối</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
          title="Chuyển đổi ngôn ngữ (VI / EN)"
          aria-label="Ngôn ngữ hệ thống"
          className={`flex items-center justify-center px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm cursor-pointer ${
            isDark
              ? 'border-[#2d3a2b] bg-[#1a2219] text-[#cbd5c0] hover:bg-[#222c21]'
              : 'border-[#cbd5e1] bg-white text-[#475569] hover:bg-slate-50'
          }`}
        >
          {locale.toUpperCase()}
        </button>
      </div>

      {/* Brand Header */}
      <header className="relative z-10 flex items-center justify-center gap-4 text-center mt-1 mb-4">
        <div
          aria-hidden="true"
          className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full border-[3px] border-[#ed7b31] bg-white text-[17px] font-extrabold text-[#4f7c00] shadow-[inset_0_0_0_3px_rgba(237,123,49,0.15)]"
        >
          DLU
        </div>
        <div className="text-left">
          <div
            className={`text-[17px] font-extrabold leading-tight tracking-wide ${
              isDark ? 'text-[#a5cd67]' : 'text-[#4f7c00]'
            }`}
          >
            TRƯỜNG ĐẠI HỌC ĐÀ LẠT
          </div>
          <div
            className={`text-[12px] font-bold leading-tight tracking-wider uppercase ${
              isDark ? 'text-[#adb9a3]' : 'text-[#64748b]'
            }`}
          >
            DALAT UNIVERSITY
          </div>
          <div
            className={`mt-1.5 text-[14px] font-bold leading-tight tracking-wide ${
              isDark ? 'text-[#ff9b59]' : 'text-[#c45d1c]'
            }`}
          >
            HỆ THỐNG QUẢN LÝ ĐIỂM DANH GPS
          </div>
        </div>
      </header>

      {/* Main Title */}
      <h1
        className={`relative z-10 text-center text-[22px] sm:text-[25px] font-bold leading-tight max-w-[500px] mb-6 ${
          isDark ? 'text-[#f1f4ec]' : 'text-[#334155]'
        }`}
      >
        Hệ thống điểm danh GPS Trường Đại học Đà Lạt
      </h1>

      {/* Login Card */}
      <section
        className={`relative z-10 w-full max-w-[500px] rounded-2xl p-6 sm:p-8 transition-all border ${
          isDark
            ? 'bg-[#182119]/95 border-[#283728] shadow-[0_12px_40px_rgba(0,0,0,0.45)]'
            : 'bg-white border-[#e2e8f0] shadow-[0_10px_35px_rgba(35,48,31,0.08)]'
        }`}
      >
        <div className="text-center mb-6">
          <h2
            className={`text-xl sm:text-[22px] font-bold ${
              isDark ? 'text-[#f1f4ec]' : 'text-[#1e293b]'
            }`}
          >
            Đăng nhập tài khoản
          </h2>
          <p
            className={`mt-1.5 text-xs sm:text-sm ${
              isDark ? 'text-[#9aa892]' : 'text-[#64748b]'
            }`}
          >
            Chào mừng bạn trở lại! Nhập thông tin để vào hệ thống.
          </p>
        </div>

        <form onSubmit={handleSubmit(handleLogin)} className="space-y-4" noValidate>
          {/* Username Field */}
          <div>
            <label
              htmlFor="username"
              className={`block text-xs font-semibold mb-1.5 text-left ${
                isDark ? 'text-[#c7d3bc]' : 'text-[#475569]'
              }`}
            >
              Tài khoản
            </label>
            <div
              className={`flex items-center rounded-lg border px-3.5 py-2.5 transition-all ${
                isDark
                  ? 'bg-[#111710] border-[#2c3a2a] text-[#f1f4ec] focus-within:border-[#88cc26] focus-within:ring-2 focus-within:ring-[#88cc26]/20'
                  : 'bg-[#f8fafc] border-[#cbd5e1] text-[#1e293b] focus-within:border-[#548000] focus-within:ring-2 focus-within:ring-[#548000]/20'
              }`}
            >
              <FaUser
                className={`mr-2.5 text-sm shrink-0 ${
                  isDark ? 'text-[#697962]' : 'text-[#94a3b8]'
                }`}
                aria-hidden="true"
              />
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Nhập tên đăng nhập hoặc MSSV"
                {...register('username', {
                  required: 'Vui lòng nhập tên đăng nhập hoặc MSSV',
                })}
                className={`w-full bg-transparent border-0 outline-none text-xs sm:text-sm ${
                  isDark
                    ? 'text-[#f1f4ec] placeholder-[#53634d]'
                    : 'text-[#1e293b] placeholder-[#94a3b8]'
                }`}
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-xs text-rose-500 text-left font-medium">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className={`block text-xs font-semibold mb-1.5 text-left ${
                isDark ? 'text-[#c7d3bc]' : 'text-[#475569]'
              }`}
            >
              Mật khẩu
            </label>
            <div
              className={`flex items-center rounded-lg border px-3.5 py-2.5 transition-all relative ${
                isDark
                  ? 'bg-[#111710] border-[#2c3a2a] text-[#f1f4ec] focus-within:border-[#88cc26] focus-within:ring-2 focus-within:ring-[#88cc26]/20'
                  : 'bg-[#f8fafc] border-[#cbd5e1] text-[#1e293b] focus-within:border-[#548000] focus-within:ring-2 focus-within:ring-[#548000]/20'
              }`}
            >
              <FaLock
                className={`mr-2.5 text-sm shrink-0 ${
                  isDark ? 'text-[#697962]' : 'text-[#94a3b8]'
                }`}
                aria-hidden="true"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                {...register('password', {
                  required: 'Vui lòng nhập mật khẩu',
                })}
                className={`w-full bg-transparent border-0 outline-none text-xs sm:text-sm pr-7 ${
                  isDark
                    ? 'text-[#f1f4ec] placeholder-[#53634d]'
                    : 'text-[#1e293b] placeholder-[#94a3b8]'
                }`}
              />
              <button
                type="button"
                onClick={togglePasswordView}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className={`absolute right-3 p-1 transition-colors cursor-pointer ${
                  isDark
                    ? 'text-[#697962] hover:text-[#d6dfce]'
                    : 'text-[#94a3b8] hover:text-[#475569]'
                }`}
              >
                {showPassword ? (
                  <FaRegEye className="text-sm" />
                ) : (
                  <FaRegEyeSlash className="text-sm" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-rose-500 text-left font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Row: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <label
              htmlFor="rememberMe"
              className={`flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer select-none ${
                isDark ? 'text-[#cbd5c0]' : 'text-[#475569]'
              }`}
            >
              <input
                id="rememberMe"
                type="checkbox"
                {...register('rememberMe')}
                className="h-4 w-4 rounded accent-[#548000] cursor-pointer"
              />
              <span>Ghi nhớ thiết bị này</span>
            </label>

            <button
              type="button"
              onClick={() =>
                toast.info(
                  'Vui lòng liên hệ quản trị viên hoặc Trung tâm CNTT để cấp lại mật khẩu.',
                )
              }
              className={`text-xs font-semibold transition-colors hover:underline cursor-pointer ${
                isDark
                  ? 'text-[#88cc26] hover:text-[#a5cd67]'
                  : 'text-[#548000] hover:text-[#3e6500]'
              }`}
            >
              Quên mật khẩu?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-[#548000] hover:bg-[#466d00] active:bg-[#395900] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#548000] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {isLoading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
            )}
            <span>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`h-px flex-1 ${
              isDark ? 'bg-[#2a3729]' : 'bg-[#e2e8f0]'
            }`}
          />
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-[#7d8d77]' : 'text-[#94a3b8]'
            }`}
          >
            Hoặc đăng nhập bằng
          </span>
          <span
            aria-hidden="true"
            className={`h-px flex-1 ${
              isDark ? 'bg-[#2a3729]' : 'bg-[#e2e8f0]'
            }`}
          />
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={() =>
            toast.info(
              'Đang thiết lập xác thực Google Workspace (@dlu.edu.vn)...',
            )
          }
          className={`w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            isDark
              ? 'bg-[#121811] hover:bg-[#1a2318] border-[#283728] text-[#d6dfce]'
              : 'bg-white hover:bg-slate-50 border-[#cbd5e1] text-[#334155] shadow-sm'
          }`}
        >
          <FcGoogle className="text-lg shrink-0" aria-hidden="true" />
          <span>Tiếp tục với Google (@dlu.edu.vn)</span>
        </button>
      </section>

      {/* Footer */}
      <footer
        className={`relative z-10 text-center text-[11px] sm:text-xs mt-6 leading-relaxed ${
          isDark ? 'text-[#697962]' : 'text-[#94a3b8]'
        }`}
      >
        <div>© 2026 Trường Đại học Đà Lạt. Bản quyền thuộc về DLU.</div>
        <div className="text-[10px] sm:text-[11px] opacity-80 mt-0.5">
          Trung tâm CNTT &amp; Thư viện số • Hệ thống điểm danh GPS v2.4.0
        </div>
      </footer>
    </main>
  );
};

export default LoginPage;
