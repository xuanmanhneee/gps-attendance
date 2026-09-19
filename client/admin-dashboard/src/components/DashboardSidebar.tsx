import type { UserProfileResponse } from '@gps-attendance/shared';
import { MdLogout } from 'react-icons/md';

import { useRole } from '../hooks/useRole';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n/translation-keys';
import type { UserRole } from '../types/user-role';
import { Brand } from './layout/Brand';
import { HelpCard } from './layout/HelpCard';
import { RoleStatus } from './layout/RoleStatus';
import { SidebarNav } from './layout/SidebarNav';
import { IconButton } from './ui/IconButton';

interface DashboardSidebarProps {
  user: UserProfileResponse | null;
  onLogout: () => void;
}

const ROLE_PROFILE_KEYS: Record<UserRole, TranslationKey> = {
  admin: 'roles.adminProfile',
  lecturer: 'roles.lecturerProfile',
};

/**
 * Sidebar dashboard: brand, vai trò của tài khoản đã xác thực (read-only),
 * menu theo role và profile có nút đăng xuất.
 */
const DashboardSidebar = ({ user, onLogout }: DashboardSidebarProps) => {
  const { t } = useTranslation();
  const role = useRole();

  const initial = user?.fullname?.charAt(0).toUpperCase() ?? '?';

  return (
    <aside
      aria-label={t('app.sidebarAria')}
      className="sticky top-0 flex h-screen w-16 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface px-2 pt-[22px] pb-[18px] md:w-[220px] md:px-3.5 lg:w-64"
    >
      <Brand />

      <div className="hidden md:block">
        <RoleStatus />
      </div>

      <SidebarNav />

      <div className="flex-1" />

      <HelpCard />

      <div className="mt-4 flex flex-col items-center gap-2.5 border-t border-line pt-4 md:flex-row md:px-2">
        <span
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-extrabold text-accent-strong"
          title={user?.fullname ?? undefined}
        >
          {initial}
        </span>

        <span className="hidden min-w-0 flex-1 md:block">
          <span className="block truncate text-[12px] font-bold text-ink">
            {user?.fullname}
          </span>

          <span className="block text-[11px] text-muted">
            {t(ROLE_PROFILE_KEYS[role])}
          </span>
        </span>

        <IconButton
          icon={MdLogout}
          onClick={onLogout}
          label={t('common.logoutAria')}
          title={t('common.logout')}
        />
      </div>
    </aside>
  );
};

export default DashboardSidebar;
