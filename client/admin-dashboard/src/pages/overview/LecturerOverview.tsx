import { useState } from 'react';
import {
  MdAdd,
  MdEventAvailable,
  MdEventBusy,
  MdHourglassEmpty,
  MdPlayCircleOutline,
} from 'react-icons/md';

import { CreateSessionModal } from '../../components/CreateSessionModal';
import SessionTable from '../../components/SessionTable';
import { PageHeading } from '../../components/ui/PageHeading';
import { Panel, PanelHeader } from '../../components/ui/Panel';
import { PanelActionLink } from '../../components/ui/PanelActionLink';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { UnavailableMetricsPanel } from '../../components/ui/UnavailableMetricsPanel';
import { UnavailableState } from '../../components/ui/DataState';
import { useAttendanceSessions } from '../../hooks/useAttendanceSessions';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { ROUTE_PATHS } from '../../routes/paths';
import { buildGreeting } from '../../utils/greeting';
import {
  countSessionsByStatus,
  countSessionsOpenedOn,
  sortSessionsByOpenAtDesc,
} from '../../utils/session-summary';

const RECENT_SESSION_LIMIT = 5;

/**
 * Dashboard cho vai trò lecturer — giữ nguyên luồng tạo/xem phiên điểm danh.
 *
 * Chỉ hiển thị cho tài khoản role `lecturer` (xem `RoleGuard`), nên phiên được
 * đọc từ `created-by-me` và CTA tạo phiên luôn hợp lệ với quyền thật.
 */
export const LecturerOverview = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { sessions, isLoading, hasError, createSession, reload } =
    useAttendanceSessions({ scope: 'created-by-me' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const counts = countSessionsByStatus(sessions);
  const recentSessions = sortSessionsByOpenAtDesc(sessions).slice(
    0,
    RECENT_SESSION_LIMIT,
  );
  const hasSummaryData = !isLoading && !hasError;
  const todayCount = countSessionsOpenedOn(sessions, new Date());

  const sessionsSubtitle = t('dashboard.recentSessionsSubtitle.lecturer');

  return (
    <>
      <PageHeading
        eyebrow={t('dashboard.lecturer.eyebrow')}
        title={buildGreeting(t, user?.fullname)}
        description={t('dashboard.lecturer.description')}
        action={
          <PrimaryButton
            label={t('dashboard.createSession')}
            icon={MdAdd}
            onClick={() => setIsCreateModalOpen(true)}
          />
        }
      />

      <section
        aria-label={t('dashboard.lecturer.eyebrow')}
        className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4"
      >
        <SummaryCard
          label={t('summary.todaySessions')}
          value={hasSummaryData ? todayCount : null}
          note={t('summary.todaySessionsNote')}
          icon={MdEventAvailable}
          tone="positive"
        />
        <SummaryCard
          label={t('summary.openSessions')}
          value={hasSummaryData ? counts.open : null}
          note={t('summary.statusNote')}
          icon={MdPlayCircleOutline}
          tone="warning"
        />
        <SummaryCard
          label={t('summary.pendingSessions')}
          value={hasSummaryData ? counts.pending : null}
          note={t('summary.statusNote')}
          icon={MdHourglassEmpty}
          tone="accent"
        />
        <SummaryCard
          label={t('summary.closedSessions')}
          value={hasSummaryData ? counts.closed : null}
          note={t('summary.statusNote')}
          icon={MdEventBusy}
          tone="neutral"
        />
      </section>

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.95fr)]">
        <Panel>
          <PanelHeader
            title={t('dashboard.mySessionsTitle')}
            subtitle={sessionsSubtitle}
            action={
              <PanelActionLink
                to={ROUTE_PATHS.attendanceSessions}
                label={`${t('common.viewAll')} →`}
              />
            }
          />

          <SessionTable
            sessions={recentSessions}
            isLoading={isLoading}
            hasError={hasError}
            onRetry={reload}
          />
        </Panel>

        <div className="grid gap-[18px]">
          <Panel>
            <PanelHeader
              title={t('dashboard.attendanceRateTitle')}
              subtitle={t('dashboard.attendanceRateSubtitle')}
            />

            <UnavailableState />
          </Panel>

          <Panel>
            <PanelHeader
              title={t('dashboard.unavailableTitle')}
              subtitle={t('dashboard.unavailableSubtitle')}
            />

            <UnavailableMetricsPanel
              itemLabelKeys={[
                'summary.attendanceRate',
                'summary.attendanceRecords',
              ]}
            />
          </Panel>
        </div>
      </div>

      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmitSuccess={async (data) => {
          await createSession(data);
          setIsCreateModalOpen(false);
        }}
      />
    </>
  );
};