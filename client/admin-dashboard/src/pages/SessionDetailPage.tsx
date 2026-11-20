import { useCallback, useEffect, useRef, useState } from 'react';
import { MdArrowBack, MdEdit, MdRefresh } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';

import type { AttendanceSessionDetailResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import { AttendanceRecordsTable } from '../components/attendance-records/AttendanceRecordsTable';
import {
  ATTENDANCE_STATUS_LABEL_KEYS,
  ATTENDANCE_STATUS_TONE_CLASS,
  PARTICIPANT_ROLE_LABEL_KEYS,
} from '../config/attendance-status';
import { EmptyState, LoadingState } from '../components/ui/DataState';
import { PageActionBarPortal } from '../components/layout/page-action-bar';
import { Panel } from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LOCALE_TAGS } from '../i18n';
import type { TranslationKey } from '../i18n/translation-keys';
import { useLocale } from '../hooks/useLocale';
import { useRole } from '../hooks/useRole';
import { useTranslation } from '../hooks/useTranslation';
import { buildSessionEditPath, ROUTE_PATHS } from '../routes/paths';
import {
  isAttendanceSessionDetail,
  parseSessionId,
} from '../types/attendance-session';
import {
  logSessionError,
  resolveSessionErrorKey,
} from '../components/sessions/session-errors';
import { MessagePage } from './MessagePage';
import {
  filterAttendanceRecords,
  summarizeAttendanceRecords,
  type AttendanceRecordStatusFilter,
} from '../utils/attendance-records/attendance-record-list';

const statusOptions: AttendanceRecordStatusFilter[] = [
  'all',
  'present',
  'absent',
  'late',
  'excused',
];

const formatDateTime = (iso: string, localeTag: string) =>
  new Date(iso).toLocaleString(localeTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const SessionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const role = useRole();

  /**
   * Admin không có route `/sessions` riêng nên quay về overview của mình;
   * organizer quay về danh sách phiên của mình. Cả hai route đều thuộc role.
   */
  const backPath =
    role === 'organizer'
      ? ROUTE_PATHS.attendanceSessions
      : ROUTE_PATHS.overview;

  const [session, setSession] =
    useState<AttendanceSessionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** Key dịch của lỗi tải phiên: id sai khác với lỗi gọi API. */
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasRefreshError, setHasRefreshError] = useState(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const [autoRefreshMinutesInput, setAutoRefreshMinutesInput] = useState('1');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<AttendanceRecordStatusFilter>('all');
  const refreshInFlightRef = useRef(false);

  const handleRefreshParticipants = useCallback(async () => {
    if (!session || refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    setIsRefreshing(true);
    setHasRefreshError(false);

    try {
      const data: unknown = await attendanceSessionsApi.getDetail(
        session.id,
        true,
      );

      // Chỉ nhận payload đúng shape detail, tránh ghi đè state bằng dữ liệu lạ.
      if (!isAttendanceSessionDetail(data)) {
        throw new Error('Unexpected attendance session detail response');
      }

      setSession((current) => (current?.id === data.id ? data : current));
    } catch (refreshError) {
      logSessionError('detail', refreshError);
      setHasRefreshError(true);
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [session]);

  const autoRefreshMinutes = Math.min(
    60,
    Math.max(1, Number.parseInt(autoRefreshMinutesInput, 10) || 1),
  );

  useEffect(() => {
    if (!isAutoRefreshEnabled || !session || session.status !== 'open') {
      return;
    }

    const interval = window.setInterval(() => {
      void handleRefreshParticipants();
    }, autoRefreshMinutes * 60_000);

    return () => window.clearInterval(interval);
  }, [
    autoRefreshMinutes,
    handleRefreshParticipants,
    isAutoRefreshEnabled,
    session,
  ]);

  useEffect(() => {
    const loadSession = async () => {
      const sessionId = parseSessionId(id);

      if (sessionId === null) {
        setErrorKey('sessionDetail.invalidId');
        setIsLoading(false);
        return;
      }

      try {
        const fetched: unknown =
          await attendanceSessionsApi.getDetail(sessionId);

        // Không ghi state "thành công giả" khi backend trả payload khác contract.
        if (!isAttendanceSessionDetail(fetched)) {
          throw new Error('Unexpected attendance session detail response');
        }

        setSession(fetched);
      } catch (loadError) {
        logSessionError('detail', loadError);
        setErrorKey(resolveSessionErrorKey(loadError, 'detail'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [id]);

  const localeTag = LOCALE_TAGS[locale];
  const canEdit =
    session !== null &&
    role === 'organizer' &&
    (session.status === 'pending' || session.status === 'open');
  const actionBar = (
    <PageActionBarPortal>
      <div className="flex w-full items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
        >
          <MdArrowBack aria-hidden="true" />
          {t('sessionDetail.backToList')}
        </button>
      </div>
    </PageActionBarPortal>
  );

  if (isLoading) {
    return (
      <>
        {actionBar}
        <Panel>
          <LoadingState description={t('sessionDetail.loading')} />
        </Panel>
      </>
    );
  }

  if (errorKey || !session) {
    return (
      <>
        {actionBar}
        <MessagePage
          variant="error"
          title={t('common.errorTitle')}
          description={t(errorKey ?? 'sessionDetail.loadError')}
          actionLabel={t('sessionDetail.backToList')}
          onAction={() => navigate(backPath)}
        />
      </>
    );
  }

  const details = [
    {
      label: t('sessionDetail.openTime'),
      value: formatDateTime(session.openAt, localeTag),
    },
    {
      label: t('sessionDetail.closeTime'),
      value: formatDateTime(session.closeAt, localeTag),
    },
    {
      label: t('sessionDetail.radius'),
      value: t('sessions.radiusValue', { value: session.radius }),
    },
  ];
  const isPlanned = session.plannedParticipants !== null;
  const displayedParticipants =
    session.plannedParticipants !== null
      ? session.plannedParticipants.map((user) => ({ user, status: null }))
      : session.participants;
  const filteredParticipants = filterAttendanceRecords(
    session.participants,
    query,
    statusFilter,
  );
  const summary = summarizeAttendanceRecords(session.participants);
  const summaryItems = [
    {
      key: 'total',
      value: summary.total,
      label: t('attendanceRecords.total'),
    },
    {
      key: 'present',
      value: summary.present,
      label: t(ATTENDANCE_STATUS_LABEL_KEYS.present),
    },
    {
      key: 'absent',
      value: summary.absent,
      label: t(ATTENDANCE_STATUS_LABEL_KEYS.absent),
    },
    {
      key: 'late',
      value: summary.late,
      label: t(ATTENDANCE_STATUS_LABEL_KEYS.late),
    },
    {
      key: 'excused',
      value: summary.excused,
      label: t(ATTENDANCE_STATUS_LABEL_KEYS.excused),
    },
  ];

  const refreshControls = session.status === 'open' && (
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-subtle px-2.5">
        <span className="text-[11px] font-semibold text-muted">
          {t('sessionDetail.autoRefresh')}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isAutoRefreshEnabled}
          aria-label={t('sessionDetail.autoRefreshAria')}
          onClick={() => setIsAutoRefreshEnabled((current) => !current)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 ${
            isAutoRefreshEnabled ? 'bg-accent-strong' : 'bg-muted-soft'
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
              isAutoRefreshEnabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {isAutoRefreshEnabled ? (
        <label className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[11px] font-semibold text-muted">
          <MdRefresh
            aria-hidden="true"
            className={`text-[15px] text-accent-strong ${
              isRefreshing ? 'animate-spin opacity-100' : 'opacity-0'
            }`}
          />
          <input
            type="number"
            min={1}
            max={60}
            step={1}
            inputMode="numeric"
            value={autoRefreshMinutesInput}
            onChange={(event) => setAutoRefreshMinutesInput(event.target.value)}
            onBlur={() =>
              setAutoRefreshMinutesInput(String(autoRefreshMinutes))
            }
            aria-label={t('sessionDetail.autoRefreshIntervalAria')}
            className="w-10 rounded-md border border-line bg-surface-subtle px-1.5 py-1 text-center text-xs font-bold tabular-nums text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-soft"
          />
          <span>{t('sessionDetail.minutes')}</span>
        </label>
      ) : (
        <button
          type="button"
          onClick={() => void handleRefreshParticipants()}
          disabled={isRefreshing}
          aria-label={t('sessionDetail.refreshAria')}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface-subtle text-accent-strong transition-colors hover:border-accent-strong/40 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MdRefresh
            aria-hidden="true"
            className={`text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-canvas p-3">
      {actionBar}

      <Panel variant="card" className="flex-none">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-5 py-2.5">
          <div className="flex min-w-0 items-baseline gap-2">
            <h3 className="truncate text-[14px] font-bold text-ink">
              {session.title}
            </h3>
            <span className="shrink-0 text-[11px] text-muted">
              #{session.id}
            </span>
          </div>

          <dl className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-baseline gap-1.5">
                <dt className="text-[10px] text-muted">{detail.label}</dt>
                <dd className="text-[11px] font-bold whitespace-nowrap text-ink">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={session.status} />
            {canEdit && (
              <button
                type="button"
                onClick={() => navigate(buildSessionEditPath(session.id))}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[11px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
              >
                <MdEdit aria-hidden="true" />
                {t('sessions.card.edit')}
              </button>
            )}
          </div>
        </div>

        {!isPlanned && (
          <div className="overflow-x-auto border-b border-line">
            <div className="grid min-w-[620px] grid-cols-5 gap-px bg-line">
              {summaryItems.map(({ key, value, label }) => (
                <div key={key} className="bg-surface-subtle px-4 py-2">
                  <p className="text-[10px] text-muted">{label}</p>
                  <p className="mt-0.5 text-base font-extrabold text-ink">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <Panel variant="card" className="min-h-0 flex-1 overflow-hidden">
        {hasRefreshError && (
          <p role="alert" className="px-5 pt-3 text-[12px] text-danger">
            {t('sessionDetail.refreshError')}
          </p>
        )}

        {isPlanned && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-2.5">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="font-bold text-ink">
                  {t('sessionDetail.participants')}
                </span>
                <span className="text-muted">
                  {t('sessionDetail.participantCount', {
                    count: displayedParticipants.length,
                  })}
                </span>
              </div>
              {refreshControls}
            </div>
            <p className="border-b border-line px-5 py-2 text-[11px] text-muted">
              {t('sessionDetail.plannedParticipantsNote')}
            </p>
          </>
        )}

        {!isPlanned && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-2.5">
            <label className="min-w-[220px] flex-1">
              <span className="sr-only">{t('attendanceRecords.search')}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('attendanceRecords.searchPlaceholder')}
                className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[12px] text-ink outline-none placeholder:text-muted-soft focus:border-accent-strong focus:ring-2 focus:ring-accent-soft"
              />
            </label>

            <label className="w-44 shrink-0">
              <span className="sr-only">{t('attendanceRecords.status')}</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as AttendanceRecordStatusFilter,
                  )
                }
                aria-label={t('attendanceRecords.status')}
                className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[12px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-soft"
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

            {refreshControls}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isPlanned && displayedParticipants.length === 0 ? (
            <EmptyState
              description={t(
                isPlanned
                  ? 'sessionDetail.emptyPlannedParticipants'
                  : 'sessionDetail.emptyParticipants',
              )}
            />
          ) : isPlanned ? (
            <ul className="divide-y divide-line">
              {displayedParticipants.map((participant) => (
                <li
                  key={participant.user.code}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div>
                    <p className="text-[13px] font-bold text-ink">
                      {participant.user.fullname}
                    </p>

                    <p className="mt-0.5 text-[11px] text-muted">
                      {t('sessionDetail.participantCode')}:{' '}
                      {participant.user.code} ·{' '}
                      {t(PARTICIPANT_ROLE_LABEL_KEYS[participant.user.role])}
                    </p>
                  </div>

                  {participant.status !== null && (
                    <span
                      className={`rounded-[5px] px-2 py-1 text-[10px] font-extrabold ${ATTENDANCE_STATUS_TONE_CLASS[participant.status]}`}
                    >
                      {t(ATTENDANCE_STATUS_LABEL_KEYS[participant.status])}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : filteredParticipants.length === 0 ? (
            <EmptyState
              description={
                session.participants.length === 0
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
        </div>
      </Panel>
    </div>
  );
};

export default SessionDetailPage;
