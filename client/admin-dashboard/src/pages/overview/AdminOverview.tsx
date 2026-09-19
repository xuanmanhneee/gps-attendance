import {
  MdEventBusy,
  MdEventNote,
  MdHourglassEmpty,
  MdPlayCircleOutline,
} from 'react-icons/md';

import SessionTable from '../../components/SessionTable';
import { DataState } from '../../components/ui/DataState';
import { PageHeading } from '../../components/ui/PageHeading';
import { Panel, PanelHeader } from '../../components/ui/Panel';
import { StatusDistribution } from '../../components/ui/StatusDistribution';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { UnavailableMetricsPanel } from '../../components/ui/UnavailableMetricsPanel';
import { useAttendanceSessions } from '../../hooks/useAttendanceSessions';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { buildGreeting } from '../../utils/greeting';
import {
  countSessionsByStatus,
  sortSessionsByOpenAtDesc,
} from '../../utils/session-summary';

const RECENT_SESSION_LIMIT = 5;

/**
 * Dashboard cho vai trò admin.
 *
 * Chỉ số lấy từ `GET /v0/attendance-sessions` — API duy nhất hiện có nguồn dữ
 * liệu cho dashboard. Các chỉ số user/unit/tag chưa có API nên được liệt kê
 * riêng ở trạng thái "chưa có nguồn dữ liệu".
 */
export const AdminOverview = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { sessions, isLoading, hasError, reload } = useAttendanceSessions();

  const counts = countSessionsByStatus(sessions);
  const recentSessions = sortSessionsByOpenAtDesc(sessions).slice(
    0,
    RECENT_SESSION_LIMIT,
  );
  const hasSummaryData = !isLoading && !hasError;

  return (
    <>
      <PageHeading
        eyebrow={t('dashboard.admin.eyebrow')}
        title={buildGreeting(t, user?.fullname)}
        description={t('dashboard.admin.description')}
      />

      <section
        aria-label={t('dashboard.admin.eyebrow')}
        className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4"
      >
        <SummaryCard
          label={t('summary.totalSessions')}
          value={hasSummaryData ? sessions.length : null}
          note={t('summary.totalSessionsNote')}
          icon={MdEventNote}
          tone="accent"
        />
        <SummaryCard
          label={t('summary.openSessions')}
          value={hasSummaryData ? counts.open : null}
          note={t('summary.statusNote')}
          icon={MdPlayCircleOutline}
          tone="positive"
        />
        <SummaryCard
          label={t('summary.pendingSessions')}
          value={hasSummaryData ? counts.pending : null}
          note={t('summary.statusNote')}
          icon={MdHourglassEmpty}
          tone="warning"
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
            title={t('dashboard.recentSessionsTitle')}
            subtitle={t('dashboard.recentSessionsSubtitle.admin')}
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
              title={t('dashboard.sessionsByStatusTitle')}
              subtitle={t('dashboard.sessionsByStatusSubtitle')}
            />

            {isLoading ? (
              <DataState variant="loading" title={t('common.loading')} />
            ) : hasError ? (
              <DataState
                variant="error"
                title={t('common.errorTitle')}
                description={t('sessions.loadError')}
                onRetry={reload}
                retryLabel={t('common.retry')}
              />
            ) : (
              <StatusDistribution counts={counts} />
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title={t('dashboard.unavailableTitle')}
              subtitle={t('dashboard.unavailableSubtitle')}
            />

            <UnavailableMetricsPanel
              itemLabelKeys={[
                'summary.totalUsers',
                'summary.units',
                'summary.tags',
              ]}
            />
          </Panel>
        </div>
      </div>
    </>
  );
};