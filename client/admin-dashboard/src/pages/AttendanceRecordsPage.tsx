import { useMemo, useState } from 'react';
import { MdRefresh } from 'react-icons/md';

import type { AttendanceStatus } from '@gps-attendance/shared';

import { AttendanceRecordsTable } from '../components/attendance-records/AttendanceRecordsTable';
import { resolveSessionErrorKey } from '../components/sessions/session-errors';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UnavailableState,
} from '../components/ui/DataState';
import { PageContainer } from '../components/ui/PageContainer';
import { Panel, PanelHeader } from '../components/ui/Panel';
import { ATTENDANCE_STATUS_LABEL_KEYS } from '../config/attendance-status';
import { useAttendanceSessionDetail } from '../hooks/useAttendanceSessionDetail';
import { useAttendanceSessions } from '../hooks/useAttendanceSessions';
import { useLocale } from '../hooks/useLocale';
import { useRole } from '../hooks/useRole';
import { useTranslation } from '../hooks/useTranslation';
import { LOCALE_TAGS } from '../i18n';
import {
  filterAttendanceRecords,
  summarizeAttendanceRecords,
  type AttendanceRecordStatusFilter,
} from '../utils/attendance-records/attendance-record-list';
import { sortSessionsByOpenAtDesc } from '../utils/session-summary';

const statusOptions: AttendanceRecordStatusFilter[] = [
  'all',
  'present',
  'absent',
  'late',
  'excused',
];

const AttendanceRecordsPage = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const role = useRole();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<AttendanceRecordStatusFilter>('all');

  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    reload: reloadSessions,
  } = useAttendanceSessions({
    scope: role === 'admin' ? 'all' : 'created-by-me',
  });

  const orderedSessions = useMemo(
    () => sortSessionsByOpenAtDesc(sessions),
    [sessions],
  );
  const effectiveSessionId =
    selectedId !== null &&
    orderedSessions.some((session) => session.id === selectedId)
      ? selectedId
      : (orderedSessions[0]?.id ?? null);
  const selectedSession =
    orderedSessions.find((session) => session.id === effectiveSessionId) ??
    null;
  const {
    detail,
    isLoading: detailLoading,
    error: detailError,
    reload: reloadDetail,
  } = useAttendanceSessionDetail(effectiveSessionId);

  const filteredParticipants = useMemo(
    () =>
      filterAttendanceRecords(detail?.participants ?? [], query, statusFilter),
    [detail, query, statusFilter],
  );
  const summary = useMemo(
    () => summarizeAttendanceRecords(detail?.participants ?? []),
    [detail],
  );
  const localeTag = LOCALE_TAGS[locale];

  const handleRefresh = async () => {
    await Promise.all([reloadSessions(), reloadDetail()]);
  };

  const summaryItems: Array<{
    status: AttendanceStatus | 'total';
    value: number;
  }> = [
    { status: 'total', value: summary.total },
    { status: 'present', value: summary.present },
    { status: 'absent', value: summary.absent },
    { status: 'late', value: summary.late },
    { status: 'excused', value: summary.excused },
  ];

  return (
    <PageContainer>
      <Panel>
        <PanelHeader
          title={t('attendanceRecords.title')}
          subtitle={
            selectedSession
              ? t('attendanceRecords.selectedSession', {
                  title: selectedSession.title,
                })
              : t('attendanceRecords.description')
          }
          action={
            effectiveSessionId !== null ? (
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={sessionsLoading || detailLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-subtle px-3 py-2 text-[12px] font-bold text-accent-strong transition-colors hover:border-accent-strong/40 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdRefresh aria-hidden="true" className="text-[16px]" />
                {t('common.refresh')}
              </button>
            ) : undefined
          }
        />

        {sessionsLoading && sessions.length === 0 ? (
          <LoadingState description={t('attendanceRecords.loadingSessions')} />
        ) : sessionsError && sessions.length === 0 ? (
          <ErrorState
            description={t(resolveSessionErrorKey(sessionsError, 'list'))}
            onRetry={() => void reloadSessions()}
          />
        ) : sessions.length === 0 ? (
          <EmptyState description={t('attendanceRecords.emptySessions')} />
        ) : (
          <>
            <div className="grid gap-3 border-b border-line p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_180px]">
              <label className="flex flex-col gap-1.5 text-[11px] font-bold text-muted">
                {t('attendanceRecords.session')}
                <select
                  value={effectiveSessionId ?? ''}
                  onChange={(event) => {
                    setSelectedId(Number(event.target.value));
                    setQuery('');
                    setStatusFilter('all');
                  }}
                  className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[12px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-soft"
                >
                  {orderedSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title} (#{session.id})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-[11px] font-bold text-muted">
                {t('attendanceRecords.search')}
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('attendanceRecords.searchPlaceholder')}
                  className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-muted-soft focus:border-accent-strong focus:ring-2 focus:ring-accent-soft"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-[11px] font-bold text-muted">
                {t('attendanceRecords.status')}
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as AttendanceRecordStatusFilter,
                    )
                  }
                  className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[12px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-soft"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === 'all'
                        ? t('attendanceRecords.allStatuses')
                        : t(ATTENDANCE_STATUS_LABEL_KEYS[status])}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {detailLoading ? (
              <LoadingState description={t('attendanceRecords.loading')} />
            ) : detailError ? (
              <ErrorState
                description={t(resolveSessionErrorKey(detailError, 'detail'))}
                onRetry={() => void reloadDetail()}
              />
            ) : detail?.plannedParticipants !== null ? (
              <UnavailableState
                description={t('attendanceRecords.rosterPending')}
              />
            ) : detail ? (
              <>
                <div className="grid grid-cols-2 gap-3 border-b border-line p-5 sm:grid-cols-3 xl:grid-cols-5">
                  {summaryItems.map((item) => (
                    <div
                      key={item.status}
                      className="rounded-lg bg-surface-subtle px-4 py-3"
                    >
                      <p className="text-[11px] text-muted">
                        {item.status === 'total'
                          ? t('attendanceRecords.total')
                          : t(ATTENDANCE_STATUS_LABEL_KEYS[item.status])}
                      </p>
                      <p className="mt-1 text-xl font-extrabold text-ink">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {filteredParticipants.length === 0 ? (
                  <EmptyState
                    description={
                      detail.participants.length === 0
                        ? t('attendanceRecords.empty')
                        : t('attendanceRecords.noMatches')
                    }
                  />
                ) : (
                  <AttendanceRecordsTable
                    participants={filteredParticipants}
                    localeTag={localeTag}
                  />
                )}
              </>
            ) : null}
          </>
        )}
      </Panel>
    </PageContainer>
  );
};

export default AttendanceRecordsPage;
