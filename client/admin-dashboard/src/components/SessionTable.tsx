import type {
  AttendanceSessionResponse,
  SessionStatus,
} from '@gps-attendance/shared';
import { useNavigate } from 'react-router-dom';

import { LOCALE_TAGS } from '../i18n';
import { useLocale } from '../hooks/useLocale';
import { useTranslation } from '../hooks/useTranslation';
import { buildSessionDetailPath } from '../routes/paths';
import { sortSessionsByOpenAtDesc } from '../utils/session-summary';
import { EmptyState, ErrorState, LoadingState } from './ui/DataState';
import { StatusBadge } from './ui/StatusBadge';

interface SessionTableProps {
  sessions: AttendanceSessionResponse[];
  isLoading: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

const statusDotClass: Record<SessionStatus, string> = {
  open: 'bg-positive',
  pending: 'bg-warning',
  closed: 'bg-muted-soft',
};

const formatDateTime = (iso: string, localeTag: string) =>
  new Date(iso).toLocaleString(localeTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const SessionTable = ({
  sessions,
  isLoading,
  hasError = false,
  onRetry,
}: SessionTableProps) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingState />;
  }

  if (hasError) {
    return (
      <ErrorState
        title={t('common.errorTitle')}
        description={t('sessions.loadError')}
        onRetry={onRetry}
      />
    );
  }

  if (sessions.length === 0) {
    return <EmptyState description={t('sessions.empty')} />;
  }

  const localeTag = LOCALE_TAGS[locale];
  const sortedSessions = sortSessionsByOpenAtDesc(sessions);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            <th
              scope="col"
              className="bg-surface-subtle px-5 py-[13px] text-left text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase"
            >
              {t('sessions.table.name')}
            </th>
            <th
              scope="col"
              className="bg-surface-subtle px-5 py-[13px] text-left text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase"
            >
              {t('sessions.table.time')}
            </th>
            <th
              scope="col"
              className="bg-surface-subtle px-5 py-[13px] text-left text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase"
            >
              {t('sessions.table.radius')}
            </th>
            <th
              scope="col"
              className="bg-surface-subtle px-5 py-[13px] text-left text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase"
            >
              {t('sessions.table.status')}
            </th>
            <th
              scope="col"
              className="bg-surface-subtle px-5 py-[13px] text-right text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase"
            >
              {t('sessions.table.actions')}
            </th>
          </tr>
        </thead>

        <tbody>
          {sortedSessions.map((session) => (
            <tr key={session.id} className="border-t border-line">
              <th
                scope="row"
                className="px-5 py-[15px] text-left align-middle text-[12px] font-bold text-ink"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`h-[7px] w-[7px] shrink-0 rounded-full ${statusDotClass[session.status]}`}
                  />
                  {session.title}
                </span>
              </th>

              <td className="px-5 py-[15px] align-middle text-[12px] text-muted">
                {formatDateTime(session.openAt, localeTag)} –{' '}
                {formatDateTime(session.closeAt, localeTag)}
              </td>

              <td className="px-5 py-[15px] align-middle text-[12px] text-muted">
                {t('sessions.radiusValue', { value: session.radius })}
              </td>

              <td className="px-5 py-[15px] align-middle">
                <StatusBadge status={session.status} />
              </td>

              <td className="px-5 py-[15px] text-right align-middle">
                <button
                  type="button"
                  onClick={() => navigate(buildSessionDetailPath(session.id))}
                  className="rounded-lg border border-transparent px-3 py-1.5 text-[12px] font-bold text-accent-strong transition-colors hover:border-accent-strong/40 hover:bg-accent-soft"
                >
                  {t('common.details')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SessionTable;
