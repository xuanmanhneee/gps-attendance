import { MdCalendarToday } from 'react-icons/md';
import { useLocation } from 'react-router-dom';

import { findNavigationItem } from '../../config/navigation';
import { LOCALE_TAGS } from '../../i18n';
import { useLocale } from '../../hooks/useLocale';
import { useRole } from '../../hooks/useRole';
import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../i18n/translation-keys';
import type { UserRole } from '../../types/user-role';
import { LocaleToggle } from './LocaleToggle';
import { ThemeToggle } from './ThemeToggle';

const CONTEXT_KEYS: Record<UserRole, TranslationKey> = {
  admin: 'topbar.context.admin',
  organizer: 'topbar.context.organizer',
};

export const Topbar = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const role = useRole();
  const { pathname } = useLocation();

  const currentItem = findNavigationItem(pathname);
  const title = currentItem
    ? t(currentItem.labelKey)
    : t('common.notFoundTitle');

  const today = new Date().toLocaleDateString(LOCALE_TAGS[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 md:px-6 lg:px-[38px]">
      <div className="min-w-0 truncate text-[12px] text-muted">
        <strong className="font-bold text-ink">{title}</strong>
        <span aria-hidden="true"> / </span>
        {t(CONTEXT_KEYS[role])}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <span className="hidden items-center gap-2 border-r border-line pr-2.5 text-[12px] text-muted lg:inline-flex">
          <MdCalendarToday
            aria-hidden="true"
            className="text-[15px] text-accent-strong"
          />
          {today}
        </span>

        <LocaleToggle />
        <ThemeToggle />
      </div>
    </header>
  );
};