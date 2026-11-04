import { MdMenu } from 'react-icons/md';
import { matchPath, useLocation } from 'react-router-dom';

import {
  findNavigationItem,
  NAVIGATION_GROUP_LABEL_KEYS,
} from '../../config/navigation';
import { useRole } from '../../hooks/useRole';
import { useTranslation } from '../../hooks/useTranslation';
import { ROUTE_PATHS } from '../../routes/paths';
import { parseSessionId } from '../../types/attendance-session';

interface TopbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Topbar = ({
  isSidebarCollapsed,
  onToggleSidebar,
}: TopbarProps) => {
  const { t } = useTranslation();
  const role = useRole();
  const { pathname } = useLocation();

  const currentItem = findNavigationItem(pathname);
  const title = currentItem
    ? t(currentItem.labelKey)
    : t('common.notFoundTitle');
  const editSessionMatch = matchPath(
    ROUTE_PATHS.attendanceSessionEdit,
    pathname,
  );
  const detailSessionMatch = matchPath(
    ROUTE_PATHS.attendanceSessionDetail,
    pathname,
  );
  const sessionId = parseSessionId(
    (editSessionMatch ?? detailSessionMatch)?.params.id,
  );
  const isSessionEdit = editSessionMatch !== null;

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-line bg-surface px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label={
            isSidebarCollapsed
              ? t('app.sidebarExpandAria')
              : t('app.sidebarCollapseAria')
          }
          aria-controls="dashboard-sidebar"
          aria-expanded={!isSidebarCollapsed}
          onClick={onToggleSidebar}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-strong"
        >
          <MdMenu aria-hidden="true" className="text-[19px]" />
        </button>

        <span aria-hidden="true" className="h-4 w-px shrink-0 bg-line" />

        <nav
          aria-label={t('app.breadcrumbAria')}
          className="flex min-w-0 items-center gap-2 truncate text-[12px]"
        >
          <span className="hidden shrink-0 text-muted sm:inline">
            {t(NAVIGATION_GROUP_LABEL_KEYS[role])}
          </span>
          <span aria-hidden="true" className="hidden text-muted-soft sm:inline">
            /
          </span>
          <span
            className={`truncate ${sessionId ? 'text-muted' : 'font-semibold text-ink'}`}
          >
            {title}
          </span>

          {sessionId !== null && (
            <>
              <span aria-hidden="true" className="shrink-0 text-muted-soft">
                /
              </span>
              <span
                className={`shrink-0 ${
                  isSessionEdit ? 'text-muted' : 'font-semibold text-ink'
                }`}
              >
                #{sessionId}
              </span>
            </>
          )}

          {isSessionEdit && (
            <>
              <span aria-hidden="true" className="shrink-0 text-muted-soft">
                /
              </span>
              <strong className="shrink-0 font-semibold text-ink">
                {t('sessions.card.edit')}
              </strong>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
