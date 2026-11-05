import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FaLock, FaMoon, FaRegEyeSlash, FaSun, FaUser } from 'react-icons/fa';
import { FaRegEye } from 'react-icons/fa6';
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
  const { locale, setLocale, t } = useLocale();
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
    const loginErrorKeyMap: Partial<Record<string, Parameters<typeof t>[0]>> = {
      [AuthErrorCode.INVALID_CREDENTIALS]: 'login.error.invalidCredentials',
      [AuthErrorCode.ACCOUNT_NOT_LINKED]: 'login.error.accountNotLinked',
      [AuthErrorCode.ROLE_NOT_ALLOWED]: 'login.error.roleNotAllowed',
    };

    try {
      await login(
        { username: data.username, password: data.password },
        data.rememberMe,
      );

      toast.success(t('login.success'));
      navigate(ROUTE_PATHS.overview, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const errorKey = error.code ? loginErrorKeyMap[error.code] : undefined;
        toast.error(errorKey ? t(errorKey) : t('login.error.generic'));
        return;
      }

      toast.error(t('login.error.generic'));
    }
  };

  return (
    <main
      className="relative flex min-h-screen w-full flex-col items-center justify-between px-4 py-6 text-ink transition-colors duration-300 font-sans"
    >
      {/* Background subtle geometric line pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background:
            'linear-gradient(135deg, transparent 0 16%, var(--color-line) 16.1% 25%, transparent 25.1%), linear-gradient(315deg, transparent 0 70%, var(--color-line) 70.1% 81%, transparent 81.1%)',
        }}
      />

      {/* Top Utilities (Theme Toggle & Language) */}
      <div className="relative z-10 flex w-full max-w-[500px] justify-end items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode(toggleResolvedTheme(resolvedTheme))}
          aria-label={
            isDark ? t('login.theme.toggleToLight') : t('login.theme.toggleToDark')
          }
          title={isDark ? t('login.theme.titleLight') : t('login.theme.titleDark')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface text-muted text-xs font-medium transition-all shadow-sm hover:text-ink cursor-pointer"
        >
          {isDark ? (
            <>
              <FaSun className="text-amber-400 text-xs shrink-0" aria-hidden="true" />
              <span>{t('login.theme.light')}</span>
            </>
          ) : (
            <>
              <FaMoon className="text-muted text-xs shrink-0" aria-hidden="true" />
              <span>{t('login.theme.dark')}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
          title={t('common.localeToggleAria')}
          aria-label={t('common.localeToggleAria')}
          className="flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-line bg-surface text-muted text-xs font-bold transition-all shadow-sm hover:text-ink cursor-pointer"
        >
          {locale.toUpperCase()}
        </button>
      </div>

      {/* Main Title */}
      <h1 className="relative z-10 text-center text-[22px] sm:text-[25px] font-bold leading-tight max-w-[500px] mb-6 text-ink">
        {t('login.title')}
      </h1>

      {/* Login Card */}
      <section className="relative z-10 w-full max-w-[500px] rounded-2xl p-6 sm:p-8 transition-all border border-line bg-surface shadow-panel">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-[22px] font-bold text-ink">
            {t('login.heading')}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-muted">
            {t('login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit(handleLogin)} className="space-y-4" noValidate>
          {/* Username Field */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold mb-1.5 text-left text-muted"
            >
              {t('login.username.label')}
            </label>
            <div className="flex items-center rounded-lg border border-line bg-surface px-3.5 py-2.5 transition-all text-ink focus-within:border-accent-strong focus-within:ring-2 focus-within:ring-accent-soft">
              <FaUser
                className="mr-2.5 text-sm shrink-0 text-muted-soft"
                aria-hidden="true"
              />
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder={t('login.username.placeholder')}
                {...register('username', {
                  required: t('login.username.required'),
                })}
                className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-ink placeholder:text-muted-soft"
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-xs text-danger text-left font-medium">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold mb-1.5 text-left text-muted"
            >
              {t('login.password.label')}
            </label>
            <div className="flex items-center rounded-lg border border-line bg-surface px-3.5 py-2.5 transition-all relative text-ink focus-within:border-accent-strong focus-within:ring-2 focus-within:ring-accent-soft">
              <FaLock
                className="mr-2.5 text-sm shrink-0 text-muted-soft"
                aria-hidden="true"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                {...register('password', {
                  required: t('login.password.required'),
                })}
                className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm pr-7 text-ink placeholder:text-muted-soft"
              />
              <button
                type="button"
                onClick={togglePasswordView}
                aria-label={
                  showPassword ? t('login.password.hide') : t('login.password.show')
                }
                className="absolute right-3 p-1 transition-colors text-muted-soft hover:text-ink cursor-pointer"
              >
                {showPassword ? (
                  <FaRegEye className="text-sm" />
                ) : (
                  <FaRegEyeSlash className="text-sm" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-danger text-left font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Row: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <label
              htmlFor="rememberMe"
              className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer select-none text-muted"
            >
              <input
                id="rememberMe"
                type="checkbox"
                {...register('rememberMe')}
                className="h-4 w-4 rounded accent-accent-strong cursor-pointer"
              />
              <span>{t('login.rememberMe')}</span>
            </label>

            <button
              type="button"
              onClick={() => toast.info(t('login.forgotPasswordHint'))}
              className="text-xs font-semibold transition-colors hover:underline text-accent-strong cursor-pointer"
            >
              {t('login.forgotPassword')}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent-strong bg-accent-strong px-[15px] text-sm font-bold text-white shadow-[0_4px_12px_oklch(52%_0.17_220_/_0.18)] transition-colors hover:bg-[oklch(45%_0.17_220)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isLoading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
            )}
            <span>{isLoading ? t('login.submitting') : t('login.submit')}</span>
          </button>
        </form>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[11px] sm:text-xs mt-6 leading-relaxed text-muted-soft">
        <div>{t('login.footer')}</div>
      </footer>
    </main>
  );
};

export default LoginPage;
