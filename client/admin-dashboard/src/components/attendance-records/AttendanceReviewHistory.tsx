import type { AttendanceReviewHistoryResponse } from '@gps-attendance/shared';

import { ATTENDANCE_REVIEW_REASON_LABEL_KEYS } from '../../config/attendance-review';
import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../i18n/translation-keys';
import { EmptyState, ErrorState, LoadingState } from '../ui/DataState';

type AttendanceReviewHistoryProps = {
  items: AttendanceReviewHistoryResponse[];
  localeTag: string;
  isLoading: boolean;
  errorDescription: string | null;
  onRetry: () => void;
};

const formatDateTime = (iso: string, localeTag: string) =>
  new Date(iso).toLocaleString(localeTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const HISTORY_COLUMN_KEYS = [
  'attendanceReview.history.participant',
  'attendanceReview.history.session',
  'attendanceReview.history.decision',
  'attendanceReview.history.signals',
  'attendanceReview.history.note',
  'attendanceReview.history.resolvedAt',
] satisfies TranslationKey[];

export const AttendanceReviewHistory = ({
  items,
  localeTag,
  isLoading,
  errorDescription,
  onRetry,
}: AttendanceReviewHistoryProps) => {
  const { t } = useTranslation();

  if (isLoading && items.length === 0) {
    return <LoadingState description={t('attendanceReview.history.loading')} />;
  }
  if (errorDescription && items.length === 0) {
    return <ErrorState description={errorDescription} onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        title={t('attendanceReview.history.emptyTitle')}
        description={t('attendanceReview.history.emptyDescription')}
      />
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[900px] border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface-subtle">
            {HISTORY_COLUMN_KEYS.map((key) => (
              <th
                key={key}
                scope="col"
                className="px-5 py-3 text-left text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase"
              >
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-line align-top">
              <td className="px-5 py-3">
                <p className="text-[12px] font-bold text-ink">
                  {item.student.fullname}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {item.student.code}
                </p>
              </td>
              <td className="px-5 py-3 text-[12px] text-ink">
                {item.session.title}{' '}
                <span className="text-muted">#{item.session.id}</span>
              </td>
              <td className="px-5 py-3">
                <span
                  className={`rounded-md px-2 py-1 text-[10px] font-extrabold ${
                    item.decision === 'approve'
                      ? 'bg-positive-soft text-positive'
                      : 'bg-danger-soft text-danger'
                  }`}
                >
                  {t(
                    item.decision === 'approve'
                      ? 'attendanceReview.history.approved'
                      : 'attendanceReview.history.rejected',
                  )}
                </span>
              </td>
              <td className="px-5 py-3">
                <div className="flex max-w-xs flex-wrap gap-1">
                  {item.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-md bg-warning-soft px-1.5 py-0.5 text-[9px] font-bold text-warning"
                    >
                      {t(ATTENDANCE_REVIEW_REASON_LABEL_KEYS[reason])}
                    </span>
                  ))}
                  {item.reasons.length === 0 && (
                    <span className="text-[11px] text-muted">—</span>
                  )}
                </div>
              </td>
              <td className="max-w-xs px-5 py-3 text-[11px] leading-relaxed text-muted">
                {item.reason || '—'}
              </td>
              <td className="px-5 py-3 text-[11px] whitespace-nowrap text-muted">
                {formatDateTime(item.resolvedAt, localeTag)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
