import { useRole } from '../../hooks/useRole';
import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../i18n/translation-keys';
import type { UserRole } from '../../types/user-role';

const ROLE_LABEL_KEYS: Record<UserRole, TranslationKey> = {
  admin: 'roles.admin',
  lecturer: 'roles.lecturer',
};

const ROLE_PILL_KEYS: Record<UserRole, TranslationKey> = {
  admin: 'roles.pill.admin',
  lecturer: 'roles.pill.lecturer',
};

/**
 * Khối hiển thị vai trò của tài khoản đã xác thực — chỉ đọc.
 *
 * Không có dropdown đổi vai trò: role lấy từ auth context nên không thể lệch
 * với quyền thật và không lưu gì vào localStorage.
 */
export const RoleStatus = () => {
  const { t } = useTranslation();
  const role = useRole();

  return (
    <div
      aria-live="polite"
      aria-label={t('roles.statusAria', { role: t(ROLE_LABEL_KEYS[role]) })}
      className="mx-1.5 mb-6 flex items-center justify-between gap-2 rounded-[10px] border border-line bg-surface-subtle px-[11px] py-2.5"
    >
      <div className="min-w-0">
        <div className="text-[11px] tracking-[0.08em] text-muted uppercase">
          {t('roles.fieldLabel')}
        </div>

        <div className="mt-px truncate text-[13px] font-bold text-ink">
          {t(ROLE_LABEL_KEYS[role])}
        </div>
      </div>

      <span className="inline-flex min-w-[75px] shrink-0 items-center justify-center rounded-full bg-accent-soft px-2 py-[5px] text-[10px] font-extrabold tracking-[0.08em] text-accent-strong uppercase">
        {t(ROLE_PILL_KEYS[role])}
      </span>
    </div>
  );
};