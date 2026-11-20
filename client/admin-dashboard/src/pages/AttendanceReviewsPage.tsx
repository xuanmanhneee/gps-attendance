import { useMemo, useState } from 'react';
import { MdFactCheck, MdHistory, MdRefresh } from 'react-icons/md';
import { toast } from 'react-toastify';

import type {
  AttendanceReviewCandidateResponse,
  AttendanceReviewDecision,
} from '@gps-attendance/shared';

import { AttendanceReviewDecisionDialog } from '../components/attendance-records/AttendanceReviewDecisionDialog';
import { AttendanceReviewHistory } from '../components/attendance-records/AttendanceReviewHistory';
import { AttendanceReviewQueue } from '../components/attendance-records/AttendanceReviewQueue';
import { resolveAttendanceReviewErrorKey } from '../components/attendance-records/attendance-review-errors';
import { resolveSessionErrorKey } from '../components/sessions/session-errors';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/ui/DataState';
import { PageContainer } from '../components/ui/PageContainer';
import { Panel, PanelHeader } from '../components/ui/Panel';
import { getReviewResolutionState } from '../config/attendance-review';
import { useAttendanceReviewHistory } from '../hooks/useAttendanceReviewHistory';
import { useAttendanceReviews } from '../hooks/useAttendanceReviews';
import { useAttendanceSessions } from '../hooks/useAttendanceSessions';
import { useLocale } from '../hooks/useLocale';
import { useTranslation } from '../hooks/useTranslation';
import { LOCALE_TAGS } from '../i18n';
import type { TranslationKey } from '../i18n/translation-keys';
import { sortSessionsByOpenAtDesc } from '../utils/session-summary';

type ReviewIntent = {
  candidate: AttendanceReviewCandidateResponse;
  decision: AttendanceReviewDecision;
};

type ReviewTab = 'current' | 'history';

const AttendanceReviewsPage = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<ReviewTab>('current');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null);
  const [decisionErrorKey, setDecisionErrorKey] =
    useState<TranslationKey | null>(null);

  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    reload: reloadSessions,
  } = useAttendanceSessions({ scope: 'created-by-me' });

  const orderedSessions = useMemo(
    () => sortSessionsByOpenAtDesc(sessions),
    [sessions],
  );
  const currentSessions = useMemo(
    () =>
      orderedSessions.filter(
        (session) =>
          session.status !== 'cancelled' &&
          getReviewResolutionState(session.openAt, session.closeAt) !==
            'closed',
      ),
    [orderedSessions],
  );
  const effectiveSessionId =
    selectedId !== null &&
    currentSessions.some((session) => session.id === selectedId)
      ? selectedId
      : (currentSessions[0]?.id ?? null);
  const selectedSession =
    currentSessions.find((session) => session.id === effectiveSessionId) ??
    null;

  const {
    candidates,
    isLoading: reviewsLoading,
    isRefreshing: reviewsRefreshing,
    error: reviewsError,
    resolvingUserId,
    reload: reloadReviews,
    resolveCandidate,
  } = useAttendanceReviews(effectiveSessionId, activeTab === 'current');

  const {
    items: historyItems,
    isLoading: historyLoading,
    error: historyError,
    reload: reloadHistory,
  } = useAttendanceReviewHistory(activeTab === 'history');

  const resolutionState =
    selectedSession && selectedSession.status !== 'cancelled'
      ? getReviewResolutionState(
          selectedSession.openAt,
          selectedSession.closeAt,
        )
      : 'closed';

  const handleConfirmReview = async (reason: string) => {
    if (!reviewIntent) return;

    setDecisionErrorKey(null);

    try {
      await resolveCandidate(
        reviewIntent.candidate.userId,
        reviewIntent.decision,
        reason || undefined,
      );

      toast.success(
        t(
          reviewIntent.decision === 'approve'
            ? 'attendanceReview.approveSuccess'
            : 'attendanceReview.rejectSuccess',
          { name: reviewIntent.candidate.student.fullname },
        ),
      );
      setReviewIntent(null);
    } catch (error) {
      setDecisionErrorKey(resolveAttendanceReviewErrorKey(error, 'resolve'));
      void reloadReviews();
    }
  };

  return (
    <PageContainer className="attendance-reviews-page">
      <Panel className="overflow-hidden">
        <PanelHeader
          title={t('attendanceReview.pageTitle')}
          subtitle={
            activeTab === 'history'
              ? t('attendanceReview.history.description')
              : selectedSession
                ? t('attendanceReview.selectedSession', {
                    title: selectedSession.title,
                  })
                : t('attendanceReview.pageDescription')
          }
          action={
            activeTab === 'history' || effectiveSessionId !== null ? (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'history') {
                    void reloadHistory();
                    return;
                  }
                  void Promise.all([reloadSessions(), reloadReviews()]);
                }}
                disabled={
                  activeTab === 'history'
                    ? historyLoading
                    : sessionsLoading ||
                      reviewsRefreshing ||
                      resolvingUserId !== null
                }
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-subtle px-3 py-2 text-[12px] font-bold text-accent-strong transition-colors hover:border-accent-strong/40 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdRefresh aria-hidden="true" className="text-[16px]" />
                {t('common.refresh')}
              </button>
            ) : undefined
          }
        />

        <div
          role="tablist"
          aria-label={t('attendanceReview.tabs.label')}
          className="flex shrink-0 gap-1 border-b border-line bg-surface px-5 pt-2"
        >
          {(
            [
              {
                id: 'current' as const,
                label: t('attendanceReview.tabs.current'),
                icon: MdFactCheck,
              },
              {
                id: 'history' as const,
                label: t('attendanceReview.tabs.history'),
                icon: MdHistory,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(tab.id);
                  setReviewIntent(null);
                  setDecisionErrorKey(null);
                }}
                className={`inline-flex min-h-10 items-center gap-2 border-b-2 px-3 text-[12px] font-bold transition-colors ${
                  isActive
                    ? 'border-accent-strong text-accent-strong'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <Icon aria-hidden="true" className="text-[15px]" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'current' ? (
          sessionsLoading && sessions.length === 0 ? (
            <LoadingState description={t('attendanceReview.loadingSessions')} />
          ) : sessionsError && sessions.length === 0 ? (
            <ErrorState
              description={t(resolveSessionErrorKey(sessionsError, 'list'))}
              onRetry={() => void reloadSessions()}
            />
          ) : currentSessions.length === 0 ? (
            <EmptyState
              title={t('attendanceReview.current.emptyTitle')}
              description={t('attendanceReview.current.emptyDescription')}
            />
          ) : (
            <>
              <div className="attendance-reviews-page__context-bar border-b border-line bg-surface px-5 py-3">
                <label className="flex max-w-xl flex-col gap-1.5 text-[11px] font-bold text-muted">
                  {t('attendanceReview.session')}
                  <select
                    value={effectiveSessionId ?? ''}
                    onChange={(event) => {
                      setSelectedId(Number(event.target.value));
                      setReviewIntent(null);
                      setDecisionErrorKey(null);
                    }}
                    className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[12px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-soft"
                  >
                    {currentSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title} (#{session.id})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <AttendanceReviewQueue
                  candidates={candidates}
                  isLoading={reviewsLoading}
                  isRefreshing={reviewsRefreshing}
                  errorDescription={
                    reviewsError
                      ? t(resolveAttendanceReviewErrorKey(reviewsError, 'list'))
                      : null
                  }
                  resolvingUserId={resolvingUserId}
                  resolutionState={resolutionState}
                  onRetry={() => void reloadReviews()}
                  onResolve={(candidate, decision) => {
                    setDecisionErrorKey(null);
                    setReviewIntent({ candidate, decision });
                  }}
                />
              </div>
            </>
          )
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            <AttendanceReviewHistory
              items={historyItems}
              localeTag={LOCALE_TAGS[locale]}
              isLoading={historyLoading}
              errorDescription={
                historyError ? t('attendanceReview.history.loadError') : null
              }
              onRetry={() => void reloadHistory()}
            />
          </div>
        )}
      </Panel>

      {reviewIntent && (
        <AttendanceReviewDecisionDialog
          key={`${reviewIntent.candidate.userId}:${reviewIntent.decision}`}
          candidate={reviewIntent.candidate}
          decision={reviewIntent.decision}
          isSubmitting={resolvingUserId === reviewIntent.candidate.userId}
          errorMessage={decisionErrorKey ? t(decisionErrorKey) : null}
          onClose={() => {
            setReviewIntent(null);
            setDecisionErrorKey(null);
          }}
          onConfirm={(reason) => void handleConfirmReview(reason)}
        />
      )}
    </PageContainer>
  );
};

export default AttendanceReviewsPage;
