import SessionTable from '../../components/SessionTable';
import { useAttendanceSessions } from '../../hooks/useAttendanceSessions';
import { useTranslation } from '../../hooks/useTranslation';
import {
  countSessionsByStatus,
  countSessionsOpenedOn,
  sortSessionsByOpenAtDesc,
} from '../../utils/session-summary';

// Chỉ vài dòng gần nhất; danh sách đầy đủ nằm ở trang "Phiên điểm danh".
const RECENT_SESSION_LIMIT = 3;

type StatProps = {
  label: string;
  value: number | null;
  className?: string;
  /** Nhấn màu nhẹ khi ô này cần chú ý (vd: đang có phiên mở). */
  highlight?: boolean;
};

/** Ô phẳng, không viền, nền tint nhạt. */
const Stat = ({ label, value, className = '', highlight }: StatProps) => (
  <div
    className={`flex flex-col justify-between gap-6 rounded-xl p-4 ${
      highlight ? 'bg-sky-50 text-sky-900' : 'bg-slate-50 text-slate-900'
    } ${className}`}
  >
    <dt className="flex items-center gap-2 text-sm text-slate-500">
      {highlight && (
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky-600" />
      )}
      {label}
    </dt>
    <dd className="text-3xl font-semibold leading-none">{value ?? '—'}</dd>
  </div>
);

/** Ô chừa sẵn cho chỉ số chưa có API: chỉ có nét đứt, không số liệu. */
const ReservedStat = ({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) => (
  <div
    className={`flex items-center justify-between rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400 ${className}`}
  >
    <dt>{label}</dt>
    <dd aria-hidden="true">—</dd>
  </div>
);

export const LecturerOverview = () => {
  const { t } = useTranslation();

  const { sessions, isLoading, error, reload } = useAttendanceSessions({
    scope: 'created-by-me',
  });

  const counts = countSessionsByStatus(sessions);
  const recentSessions = sortSessionsByOpenAtDesc(sessions).slice(
    0,
    RECENT_SESSION_LIMIT,
  );
  const hasSummaryData = !isLoading && !error;
  const todayCount = countSessionsOpenedOn(sessions, new Date());

  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto w-full max-w-[960px] px-4 pt-6 pb-10 md:px-6 md:pt-[34px] md:pb-[42px]">
        <dl className="mb-10 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Điểm nhấn duy nhất */}
          <div className="flex min-h-[132px] flex-col justify-between rounded-xl bg-sky-700 p-5 text-white">
            <dt className="text-sm text-sky-100">
              {t('summary.todaySessions')}
            </dt>
            <dd className="text-6xl font-semibold leading-none">
              {hasSummaryData ? todayCount : '—'}
            </dd>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Stat
              className="lg:col-span-2"
              label={t('summary.openSessions')}
              value={hasSummaryData ? counts.open : null}
              highlight={hasSummaryData && counts.open > 0}
            />
            <Stat
              className="lg:col-span-2"
              label={t('summary.pendingSessions')}
              value={hasSummaryData ? counts.pending : null}
            />
            <Stat
              className="col-span-2 lg:col-span-2"
              label={t('summary.closedSessions')}
              value={hasSummaryData ? counts.closed : null}
            />
            <ReservedStat
              className="lg:col-span-3"
              label={t('summary.attendanceRate')}
            />
            <ReservedStat
              className="lg:col-span-3"
              label={t('summary.attendanceRecords')}
            />
          </div>
        </dl>

        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {t('dashboard.mySessionsTitle')}
          </h2>
          <SessionTable
            sessions={recentSessions}
            isLoading={isLoading}
            error={error}
            onRetry={reload}
          />
        </section>
      </div>
    </div>
  );
};