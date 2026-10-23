import { useEffect, useRef, useState } from 'react';
import type { UserProfileResponse } from '@gps-attendance/shared';
import {
  MdKeyboardArrowUp,
  MdLanguage,
  MdLogout,
  MdPalette,
  MdSettings,
} from 'react-icons/md';

import { useRole } from '../hooks/useRole';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n/translation-keys';
import type { UserRole } from '../types/user-role';
import { Brand } from './layout/Brand';
import { SidebarNav } from './layout/SidebarNav';
import { LocaleToggle } from './layout/LocaleToggle';
import { ThemeToggle } from './layout/ThemeToggle';

interface DashboardSidebarProps {
  user: UserProfileResponse | null;
  onLogout: () => void;
}

const ROLE_PROFILE_KEYS: Record<UserRole, TranslationKey> = {
  admin: 'roles.adminProfile',
  lecturer: 'roles.lecturerProfile',
};

const DashboardSidebar = ({ user, onLogout }: DashboardSidebarProps) => {
  const { t } = useTranslation();
  const role = useRole();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const initial = user?.fullname?.charAt(0).toUpperCase() || '?';

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsSettingsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    onLogout();
  };

  return (
    <aside
      aria-label={t('app.sidebarAria')}
      className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col
        overflow-y-auto border-r border-line bg-surface
        px-2 pt-[22px] pb-3 md:w-[220px] md:px-3.5 lg:w-64"
    >
      <Brand />

      <SidebarNav />

      <div className="mt-auto border-t border-line pt-3">
        <div ref={menuRef} className="relative">
          {isMenuOpen && (
            <div
              id="sidebar-profile-menu"
              className="absolute bottom-full left-0 z-50 mb-2
      w-[240px] max-w-[calc(100vw-5rem)]
      rounded-xl border border-line bg-surface
      p-2 shadow-xl"
            >
              {isSettingsOpen ? (
                <>
                  <div className="flex items-center gap-2 border-b border-line px-2 pb-2">
                    <button
                      type="button"
                      aria-label="Quay lại menu tài khoản"
                      onClick={() => setIsSettingsOpen(false)}
                      className="rounded-md p-1.5 text-muted hover:bg-surface-secondary"
                    >
                      <MdKeyboardArrowUp className="rotate-[-90deg] text-lg" />
                    </button>

                    <span className="text-sm font-semibold text-ink">
                      Cài đặt
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg px-3 py-3">
                    <MdLanguage
                      aria-hidden="true"
                      className="shrink-0 text-lg text-muted"
                    />
                    <span className="flex-1 text-sm text-ink">Ngôn ngữ</span>
                    <LocaleToggle />
                  </div>

                  <div className="flex items-center gap-3 rounded-lg px-3 py-3">
                    <MdPalette
                      aria-hidden="true"
                      className="shrink-0 text-lg text-muted"
                    />
                    <span className="flex-1 text-sm text-ink">Giao diện</span>
                    <ThemeToggle />
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex w-full items-center gap-3 rounded-lg
          px-3 py-2.5 text-left text-sm text-ink
          transition-colors hover:bg-surface-secondary"
                >
                  <MdSettings
                    aria-hidden="true"
                    className="shrink-0 text-lg text-muted"
                  />
                  Cài đặt
                </button>
              )}

              {!isSettingsOpen && (
                <>
                  <div className="my-1 border-t border-line" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg
            px-3 py-2.5 text-left text-sm text-danger
            transition-colors hover:bg-surface-secondary"
                  >
                    <MdLogout aria-hidden="true" className="shrink-0 text-lg" />
                    {t('common.logout')}
                  </button>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            aria-label={user?.fullname ?? 'Tài khoản'}
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            aria-controls="sidebar-profile-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex w-full items-center gap-2.5 rounded-xl
              p-2 text-left transition-colors
              hover:bg-surface-secondary
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-accent-strong"
          >
            <span
              className="grid h-[34px] w-[34px] shrink-0
                place-items-center rounded-full bg-accent-soft
                text-xs font-extrabold text-accent-strong"
            >
              {initial}
            </span>

            <span className="hidden min-w-0 flex-1 md:block">
              <span className="block truncate text-xs font-bold text-ink">
                {user?.fullname ?? 'Tài khoản'}
              </span>

              <span className="block truncate text-[11px] text-muted">
                {t(ROLE_PROFILE_KEYS[role])}
              </span>
            </span>

            <MdKeyboardArrowUp
              aria-hidden="true"
              className={`hidden shrink-0 text-muted transition-transform
                md:block ${isMenuOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
