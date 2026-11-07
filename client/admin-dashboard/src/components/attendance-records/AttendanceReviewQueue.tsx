import {
  MdCheckCircle,
  MdFactCheck,
  MdOutlineSchedule,
  MdWarningAmber,
} from 'react-icons/md';

import type {
  AttendanceReviewCandidateResponse,
  AttendanceReviewDecision,
} from '@gps-attendance/shared';

import {
  ATTENDANCE_REVIEW_REASON_LABEL_KEYS,
  type ReviewResolutionState,
} from '../../config/attendance-review';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState, ErrorState, LoadingState } from '../ui/DataState';

type AttendanceReviewQueueProps = {
  candidates: AttendanceReviewCandidateResponse[];
  isLoading: boolean;
  isRefreshing: boolean;
  errorDescription: string | null;
  resolvingUserId: number | null;
  resolutionState: ReviewResolutionState;
  onRetry: () => void;
  onResolve: (
    candidate: AttendanceReviewCandidateResponse,
    decision: AttendanceReviewDecision,
  ) => void;
};

const resolutionToneClass: Record<ReviewResolutionState, string> = {
  'not-open': 'bg-surface-subtle text-muted',
  open: 'bg-positive-soft text-positive',
  closed: 'bg-danger-soft text-danger',
};

const resolutionLabelKey = {
  'not-open': 'attendanceReview.window.notOpen',
  open: 'attendanceReview.window.open',
  closed: 'attendanceReview.window.closed',
} as const;

export const AttendanceReviewQueue = ({
  candidates,
  isLoading,
  isRefreshing,
  errorDescription,
  resolvingUserId,
  resolutionState,
  onRetry,
  onResolve,
}: AttendanceReviewQueueProps) => {
  const { t } = useTranslation();
  const canResolve = resolutionState === 'open';

  return (
    <section
      aria-labelledby="attendance-review-heading"
      className="attendance-reviews-page__queue"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface-subtle/55 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning"
          >
            <MdFactCheck className="text-xl" />
          </span>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="attendance-review-heading"
                className="text-[14px] font-extrabold text-ink"
              >
                {t('attendanceReview.queueTitle')}
              </h2>
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-extrabold text-warning tabular-nums">
                {t('attendanceReview.pendingCount', {
                  count: candidates.length,
                })}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted">
              {t('attendanceReview.queueDescription')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRefreshing && !isLoading && (
            <span
              role="status"
              className="text-[11px] font-semibold text-muted"
            >
              {t('attendanceReview.refreshing')}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${resolutionToneClass[resolutionState]}`}
          >
            <MdOutlineSchedule aria-hidden="true" className="text-[13px]" />
            {t(resolutionLabelKey[resolutionState])}
          </span>
        </div>
      </div>

      {isLoading ? (
        <LoadingState description={t('attendanceReview.loading')} />
      ) : errorDescription ? (
        <ErrorState description={errorDescription} onRetry={onRetry} />
      ) : candidates.length === 0 ? (
        <EmptyState
          title={t('attendanceReview.emptyTitle')}
          description={t('attendanceReview.emptyDescription')}
        />
      ) : (
        <div className="divide-y divide-line">
          {!canResolve && (
            <div
              role="status"
              className="flex items-start gap-2 bg-warning-soft/55 px-5 py-3 text-[11px] leading-relaxed text-warning"
            >
              <MdWarningAmber
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[15px]"
              />
              {t(
                resolutionState === 'not-open'
                  ? 'attendanceReview.window.notOpenHint'
                  : 'attendanceReview.window.closedHint',
              )}
            </div>
          )}

          {candidates.map((candidate) => {
            const isResolving = resolvingUserId === candidate.userId;
            const initials = candidate.student.fullname
              .split(/\s+/)
              .filter(Boolean)
              .slice(-2)
              .map((part) => part[0]?.toLocaleUpperCase())
              .join('');

            return (
              <article
                key={candidate.userId}
                className="attendance-review-card grid gap-4 px-5 py-4 transition-colors hover:bg-surface-subtle/50 lg:grid-cols-[minmax(220px,0.8fr)_minmax(300px,1.2fr)_auto] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-[11px] font-extrabold text-accent-strong"
                  >
                    {initials || '—'}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-extrabold text-ink">
                      {candidate.student.fullname}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {t('attendanceReview.participantCode')}:{' '}
                      <span className="font-bold text-ink">
                        {candidate.student.code}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase">
                    {t('attendanceReview.flaggedSignals')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="inline-flex items-center gap-1 rounded-md border border-warning/15 bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning"
                      >
                        <MdWarningAmber aria-hidden="true" />
                        {t(ATTENDANCE_REVIEW_REASON_LABEL_KEYS[reason])}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    disabled={!canResolve || resolvingUserId !== null}
                    onClick={() => onResolve(candidate, 'reject')}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-danger/25 bg-surface px-3 text-[11px] font-extrabold text-danger transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {t('attendanceReview.reject')}
                  </button>
                  <button
                    type="button"
                    disabled={!canResolve || resolvingUserId !== null}
                    onClick={() => onResolve(candidate, 'approve')}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-positive bg-positive px-3 text-[11px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <MdCheckCircle aria-hidden="true" className="text-[14px]" />
                    {isResolving
                      ? t('attendanceReview.resolving')
                      : t('attendanceReview.approve')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
