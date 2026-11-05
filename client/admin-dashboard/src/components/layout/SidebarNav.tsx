import { NavLink } from 'react-router-dom';

import { getNavigationForRole } from '../../config/navigation';
import { useRole } from '../../hooks/useRole';
import { useTranslation } from '../../hooks/useTranslation';
import { NAVIGATION_ICONS } from './navigation-icons';

interface SidebarNavProps {
  isCollapsed: boolean;
}

export const SidebarNav = ({ isCollapsed }: SidebarNavProps) => {
  const role = useRole();
  const { t } = useTranslation();

  const items = getNavigationForRole(role);

  return (
    <nav aria-label={t('app.primaryNavAria')}>
      {items.map((item) => {
        const Icon = NAVIGATION_ICONS[item.id];

        return (
          <NavLink
            key={item.id}
            to={item.path}
            aria-label={t(item.labelKey)}
            title={isCollapsed ? t(item.labelKey) : undefined}
            className={({ isActive }) =>
              `my-0.5 flex min-h-[42px] items-center justify-center gap-[11px] rounded-lg px-0 font-semibold no-underline transition-colors ${
                isCollapsed ? '' : 'md:justify-start md:px-3'
              } ${
                isActive
                  ? 'bg-accent-soft text-accent-strong'
                  : 'text-muted hover:bg-surface-subtle hover:text-ink'
              }`
            }
          >
            <Icon aria-hidden="true" className="h-[17px] w-[17px] shrink-0" />
            <span className={`hidden ${isCollapsed ? '' : 'md:inline'}`}>
              {t(item.labelKey)}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
};
