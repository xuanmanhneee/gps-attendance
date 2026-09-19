import type { SessionStatus } from '@gps-attendance/shared';

import { SESSION_STATUS_LABEL_KEYS } from '../../config/session-status';
import { useTranslation } from '../../hooks/useTranslation';

const statusToneClass: Record<SessionStatus, string> = {
  open: 'bg-positive-soft text-positive',
  pending: 'bg-warning-soft text-warning',
  closed: 'bg-surface-subtle text-muted',
};

type StatusBadgeProps = {
  status: SessionStatus;
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[5px] px-2 py-1 text-[10px] font-extrabold ${statusToneClass[status]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(SESSION_STATUS_LABEL_KEYS[status])}
    </span>
  );
};