import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MdArrowBack,
  MdEdit,
  MdOpenInNew,
  MdRefresh,
} from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';

import type { AttendanceSessionDetailResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import {
  ATTENDANCE_STATUS_LABEL_KEYS,
  ATTENDANCE_STATUS_TONE_CLASS,
  PARTICIPANT_ROLE_LABEL_KEYS,
} from '../config/attendance-status';
import { EmptyState, LoadingState } from '../components/ui/DataState';
import { PageActionBarPortal } from '../components/layout/page-action-bar';
import { Panel, PanelHeader } from '../components/ui/Panel';
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
    if (
      !isAutoRefreshEnabled ||
      !session ||
      session.status !== 'open'
    ) {
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

        {session && (
          <div className="flex shrink-0 items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => navigate(buildSessionEditPath(session.id))}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
              >
                <MdEdit aria-hidden="true" />
                {t('sessions.card.edit')}
              </button>
            )}
          </div>
        )}
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
    {
      label: t('sessionDetail.coordinates'),
      value: `${session.latitude}, ${session.longitude}`,
    },
  ];
  const isPlanned = session.plannedParticipants !== null;
  const displayedParticipants =
    session.plannedParticipants !== null
      ? session.plannedParticipants.map((user) => ({ user, status: null }))
      : session.participants;

  return (
    <>
      {actionBar}

      <Panel className="mb-4">
        <PanelHeader
          title={session.title}
          subtitle={`#${session.id}`}
          action={<StatusBadge status={session.status} />}
        />

        <dl className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="rounded-lg bg-surface-subtle px-4 py-3"
            >
              <dt className="text-[11px] text-muted">{detail.label}</dt>
              <dd className="mt-1 text-[13px] font-bold text-ink">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-line px-5 py-3">
          <a
            href={`https://www.google.com/maps?q=${session.latitude},${session.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-accent-strong bg-accent-strong px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[oklch(45%_0.17_220)]"
          >
            <MdOpenInNew aria-hidden="true" className="text-[15px]" />
            {t('sessionDetail.openMaps')}
          </a>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title={t('sessionDetail.participants')}
          action={
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-[12px] text-muted">
                {t('sessionDetail.participantCount', {
                  count: displayedParticipants.length,
                })}
              </span>

              {session.status === 'open' && (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-subtle p-1.5">
                  <span className="pl-1 text-[11px] font-semibold text-muted">
                    {t('sessionDetail.autoRefresh')}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isAutoRefreshEnabled}
                    aria-label={t('sessionDetail.autoRefreshAria')}
                    onClick={() =>
                      setIsAutoRefreshEnabled((current) => !current)
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 ${
                      isAutoRefreshEnabled
                        ? 'bg-accent-strong'
                        : 'bg-muted-soft'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
                        isAutoRefreshEnabled
                          ? 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {session.status === 'open' && (
                <div className="flex w-28 shrink-0 justify-end">
                  {isAutoRefreshEnabled ? (
                  <label className="flex min-h-9 w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[11px] font-semibold text-muted">
                    <span className="grid w-[15px] shrink-0 place-items-center">
                      <MdRefresh
                        aria-hidden="true"
                        className={`text-[15px] text-accent-strong ${
                          isRefreshing ? 'animate-spin opacity-100' : 'opacity-0'
                        }`}
                      />
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      step={1}
                      inputMode="numeric"
                      value={autoRefreshMinutesInput}
                      onChange={(event) =>
                        setAutoRefreshMinutesInput(event.target.value)
                      }
                      onBlur={() =>
                        setAutoRefreshMinutesInput(String(autoRefreshMinutes))
                      }
                      aria-label={t('sessionDetail.autoRefreshIntervalAria')}
                      className="w-12 rounded-md border border-line bg-surface-subtle px-2 py-1 text-center text-xs font-bold tabular-nums text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-soft"
                    />
                    <span>{t('sessionDetail.minutes')}</span>
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRefreshParticipants()}
                    disabled={isRefreshing}
                    aria-label={t('sessionDetail.refreshAria')}
                    className="inline-flex min-h-9 items-center rounded-lg border border-line bg-surface-subtle px-3 text-accent-strong transition-colors hover:border-accent-strong/40 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MdRefresh
                      aria-hidden="true"
                      className={`text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                  </button>
                  )}
                </div>
              )}
            </div>
          }
        />

        {hasRefreshError && (
          <p role="alert" className="px-5 pt-3 text-[12px] text-danger">
            {t('sessionDetail.refreshError')}
          </p>
        )}

        {isPlanned && (
          <p className="px-5 pt-3 text-[12px] text-muted">
            {t('sessionDetail.plannedParticipantsNote')}
          </p>
        )}

        {displayedParticipants.length === 0 ? (
          <EmptyState
            description={t(
              isPlanned
                ? 'sessionDetail.emptyPlannedParticipants'
                : 'sessionDetail.emptyParticipants',
            )}
          />
        ) : (
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
        )}
      </Panel>
    </>
  );
};

export default SessionDetailPage;
