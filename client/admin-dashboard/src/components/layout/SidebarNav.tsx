import { NavLink } from 'react-router-dom';

import {
  getNavigationForRole,
  NAVIGATION_GROUP_LABEL_KEYS,
} from '../../config/navigation';
import { useRole } from '../../hooks/useRole';
import { useTranslation } from '../../hooks/useTranslation';
import { NAVIGATION_ICONS } from './navigation-icons';

export const SidebarNav = () => {
  const role = useRole();
  const { t } = useTranslation();

  const items = getNavigationForRole(role);

  return (
    <nav aria-label={t('app.primaryNavAria')}>
      <p className="hidden px-3 pb-2 text-[10px] font-extrabold tracking-[0.12em] text-muted-soft uppercase md:block">
        {t(NAVIGATION_GROUP_LABEL_KEYS[role])}
      </p>

      {items.map((item) => {
        const Icon = NAVIGATION_ICONS[item.id];

        return (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `my-0.5 flex min-h-[42px] items-center justify-center gap-[11px] rounded-lg px-0 font-semibold no-underline transition-colors md:justify-start md:px-3 ${
                isActive
                  ? 'bg-accent-soft text-accent-strong'
                  : 'text-muted hover:bg-surface-subtle hover:text-ink'
              }`
            }
          >
            <Icon aria-hidden="true" className="h-[17px] w-[17px] shrink-0" />
            <span className="hidden md:inline">{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};