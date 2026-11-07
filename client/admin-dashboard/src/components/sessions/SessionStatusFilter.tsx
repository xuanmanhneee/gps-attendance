import { useTranslation } from '../../hooks/useTranslation';
import type { StatusFilter } from '../../hooks/useSessionStatusFilter';
import type { TranslationKey } from '../../i18n/translation-keys';

type Props = {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
};

/**
 * Chỉ liệt kê các trạng thái "sống". `cancelled` bị loại vì được coi là
 * soft delete — người dùng muốn xem thì dùng toggle "Hiện phiên đã huỷ"
 * ở nơi khác.
 */
const STATUS_OPTIONS: { value: StatusFilter; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'sessions.filter.allStatuses' },
  { value: 'open', labelKey: 'sessions.status.open' },
  { value: 'pending', labelKey: 'sessions.status.pending' },
  { value: 'closed', labelKey: 'sessions.status.closed' },
];

export const SessionStatusFilter = ({ value, onChange }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="sessions-status-filter"
        className="text-[12px] font-bold text-ink"
      >
        {t('sessions.filter.statusLabel')}
      </label>
      <select
        id="sessions-status-filter"
        value={value}
        onChange={(e) => onChange(e.target.value as StatusFilter)}
        className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] text-ink outline-none transition-colors focus:border-accent-strong"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
};
