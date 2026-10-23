import { useMemo, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import { SessionDaySection } from '../components/sessions/SessionDaySection';
import { SessionStatusFilter } from '../components/sessions/SessionStatusFilter';
import { ScrollArea } from '../components/layout/ScrollArea';
import { PageContainer } from '../components/ui/PageContainer';
import { Panel } from '../components/ui/Panel';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAttendanceSessions } from '../hooks/useAttendanceSessions';
import { useRole } from '../hooks/useRole';
import { useScrollToAnchor } from '../hooks/useScrollToAnchor';
import { useSessionStatusFilter } from '../hooks/useSessionStatusFilter';
import { useTranslation } from '../hooks/useTranslation';
import { ROUTE_PATHS } from '../routes/paths';
import { groupSessionsByOpenDay } from '../utils/attendance-sessions/group-sessions-by-day';

import { toast } from 'react-toastify';
import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import {
  logSessionError,
  resolveSessionErrorKey,
} from '../components/sessions/session-errors';

const LecturerSessionsView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [includeCancelled, setIncludeCancelled] = useState(false);

  const { sessions, isLoading, error, reload } = useAttendanceSessions({
    scope: 'created-by-me',
  });

  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const handleCancel = async (session: AttendanceSessionResponse) => {
    if (!window.confirm(t('sessions.card.cancelConfirm'))) return;
    setCancellingId(session.id);
    try {
      await attendanceSessionsApi.cancel(session.id);
      toast.success(t('sessions.cancelSuccess'));
      await reload();
    } catch (error) {
      logSessionError('cancel', error);
      toast.error(t(resolveSessionErrorKey(error, 'cancel')));
    } finally {
      setCancellingId(null);
    }
  };

  const { statusFilter, setStatusFilter, filteredSessions } =
    useSessionStatusFilter(sessions, {
      includeCancelledOnAll: includeCancelled,
    });

  const groups = useMemo(
    () => groupSessionsByOpenDay(filteredSessions),
    [filteredSessions],
  );

  const isReady = !isLoading && !error;
  const { anchorRef, anchorIndex } = useScrollToAnchor(groups, isReady);

  const hasCancelled = sessions.some((s) => s.status === 'cancelled');
  const showFilteredEmpty = isReady && filteredSessions.length === 0;

  return (
    <Panel>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <SessionStatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
          />
          {hasCancelled && (
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <input
                type="checkbox"
                checked={includeCancelled}
                onChange={(e) => setIncludeCancelled(e.target.checked)}
                className="rounded border-line"
              />
              {t('sessions.filter.includeCancelled')}
            </label>
          )}
        </div>

        <PrimaryButton
          label={t('dashboard.createSession')}
          icon={MdAdd}
          onClick={() => navigate(ROUTE_PATHS.attendanceSessionCreate)}
        />
      </div>

      <ScrollArea>
        {showFilteredEmpty ? (
          <p className="px-5 py-8 text-center text-[12px] text-muted">
            {hasCancelled && !includeCancelled
              ? t('sessions.emptyMaybeHiddenCancelled')
              : t('sessions.emptyFiltered')}
          </p>
        ) : (
          <div className="flex flex-col gap-2 p-2">
            {groups.map((group, idx) => (
              <SessionDaySection
                key={group.dateKey}
                group={group}
                ref={idx === anchorIndex ? anchorRef : undefined}
                onCancel={handleCancel}
                cancellingId={cancellingId}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </Panel>
  );
};

const AdminSessionsView = () => {
  const { t } = useTranslation();

  const [includeCancelled, setIncludeCancelled] = useState(false);

  const { sessions, isLoading, error } = useAttendanceSessions({
    scope: 'all',
  });

  const { statusFilter, setStatusFilter, filteredSessions } =
    useSessionStatusFilter(sessions, {
      includeCancelledOnAll: includeCancelled,
    });

  const groups = useMemo(
    () => groupSessionsByOpenDay(filteredSessions),
    [filteredSessions],
  );

  const isReady = !isLoading && !error;
  const { anchorRef, anchorIndex } = useScrollToAnchor(groups, isReady);

  const hasCancelled = sessions.some((s) => s.status === 'cancelled');
  const showFilteredEmpty = isReady && filteredSessions.length === 0;

  return (
    <Panel>
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-line px-5 py-4">
        <SessionStatusFilter value={statusFilter} onChange={setStatusFilter} />
        {hasCancelled && (
          <label className="flex items-center gap-2 text-[12px] text-muted">
            <input
              type="checkbox"
              checked={includeCancelled}
              onChange={(e) => setIncludeCancelled(e.target.checked)}
              className="rounded border-line"
            />
            {t('sessions.filter.includeCancelled')}
          </label>
        )}
      </div>

      <ScrollArea>
        {showFilteredEmpty ? (
          <p className="px-5 py-8 text-center text-[12px] text-muted">
            {hasCancelled && !includeCancelled
              ? t('sessions.emptyMaybeHiddenCancelled')
              : t('sessions.emptyFiltered')}
          </p>
        ) : (
          <div className="flex flex-col gap-2 p-2">
            {groups.map((group, idx) => (
              <SessionDaySection
                key={group.dateKey}
                group={group}
                ref={idx === anchorIndex ? anchorRef : undefined}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </Panel>
  );
};

const SessionsPage = () => {
  const role = useRole();

  return (
    <PageContainer>
      {role === 'admin' ? <AdminSessionsView /> : <LecturerSessionsView />}
    </PageContainer>
  );
};

export default SessionsPage;
