import type { AttendanceSessionResponse } from '@gps-attendance/shared';
import { useNavigate } from 'react-router-dom';

import { SESSION_STATUS_DOT_CLASS } from '../config/session-status';
import { LOCALE_TAGS } from '../i18n';
import { useLocale } from '../hooks/useLocale';
import { useTranslation } from '../hooks/useTranslation';
import { buildSessionDetailPath } from '../routes/paths';
import {
  resolveSessionListState,
  shouldShowSessionStaleError,
} from '../utils/attendance-sessions/session-list';
import { sortSessionsByOpenAtDesc } from '../utils/session-summary';
import { resolveSessionErrorKey } from './sessions/session-errors';
import { EmptyState, ErrorState, LoadingState } from './ui/DataState';
import { StatusBadge } from './ui/StatusBadge';

interface SessionTableProps {
  sessions: AttendanceSessionResponse[];
  isLoading: boolean;
  /**
   * Loi tai danh sach - da map sang message i18n khi render.
   *
   * Khi van con du lieu, bang giu cac dong dang co va hien thi canh bao kem nut
   * thu lai thay vi xoa du lieu nguoi dung dang xem.
   */
  error?: Error | null;
  onRetry?: () => void;
}

const cellHeadClass =
  'bg-surface-subtle px-5 py-[13px] text-left text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase';

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
  error = null,
  onRetry,
}: SessionTableProps) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();

  const listState = resolveSessionListState({
    sessionCount: sessions.length,
    isLoading,
    error,
  });

  if (listState === 'loading') {
    return <LoadingState />;
  }

  if (listState === 'error') {
    return (
      <ErrorState
        title={t('common.errorTitle')}
        description={t(resolveSessionErrorKey(error, 'list'))}
        onRetry={onRetry}
      />
    );
  }

  if (listState === 'empty') {
    return <EmptyState description={t('sessions.empty')} />;
  }

  const localeTag = LOCALE_TAGS[locale];
  const sortedSessions = sortSessionsByOpenAtDesc(sessions);
  const showStaleError = shouldShowSessionStaleError({
    sessionCount: sessions.length,
    error,
  });

  return (
    <>
      {showStaleError && (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 text-[12px] font-bold text-danger"
        >
          {t('sessions.staleDataWarning')}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-line bg-surface-subtle px-3 py-1 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
            >
              {t('common.retry')}
            </button>
          )}
        </p>
      )}

      {isLoading && (
        <p
          role="status"
          className="border-b border-line px-5 py-2 text-[11px] text-muted"
        >
          {t('sessions.reloading')}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <th scope="col" className={cellHeadClass}>
                {t('sessions.table.name')}
              </th>
              <th scope="col" className={cellHeadClass}>
                {t('sessions.table.time')}
              </th>
              <th scope="col" className={cellHeadClass}>
                {t('sessions.table.radius')}
              </th>
              <th scope="col" className={cellHeadClass}>
                {t('sessions.table.status')}
              </th>
              <th scope="col" className={`${cellHeadClass} text-right`}>
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
                      className={`h-[7px] w-[7px] shrink-0 rounded-full ${SESSION_STATUS_DOT_CLASS[session.status]}`}
                    />
                    {session.title}
                  </span>
                </th>

                <td className="px-5 py-[15px] align-middle text-[12px] text-muted">
                  {formatDateTime(session.openAt, localeTag)} -{' '}
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
    </>
  );
};

export default SessionTable;