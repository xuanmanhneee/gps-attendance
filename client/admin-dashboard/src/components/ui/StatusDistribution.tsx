import type { SessionStatus } from '@gps-attendance/shared';

import {
  SESSION_STATUS_LABEL_KEYS,
  SESSION_STATUS_ORDER,
} from '../../config/session-status';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from './DataState';

const statusBarClass: Record<SessionStatus, string> = {
  open: 'bg-positive',
  pending: 'bg-warning',
  closed: 'bg-muted-soft',
};

type StatusDistributionProps = {
  /** Số phiên theo từng trạng thái, tính từ dữ liệu API trả về. */
  counts: Record<SessionStatus, number>;
};

export const StatusDistribution = ({ counts }: StatusDistributionProps) => {
  const { t } = useTranslation();

  const total = SESSION_STATUS_ORDER.reduce(
    (sum, status) => sum + counts[status],
    0,
  );

  if (total === 0) {
    return <EmptyState description={t('sessions.empty')} />;
  }

  return (
    <ul className="space-y-[14px] px-5 py-[18px]">
      {SESSION_STATUS_ORDER.map((status) => {
        const count = counts[status];
        const percent = Math.round((count / total) * 100);

        return (
          <li key={status}>
            <div className="flex items-center justify-between gap-3 text-[12px]">
              <span className="font-semibold text-ink">
                {t(SESSION_STATUS_LABEL_KEYS[status])}
              </span>

              <span className="tabular-nums text-muted">
                {count.toLocaleString()} · {percent}%
              </span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
              <div
                aria-hidden="true"
                className={`h-full rounded-full ${statusBarClass[status]}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};