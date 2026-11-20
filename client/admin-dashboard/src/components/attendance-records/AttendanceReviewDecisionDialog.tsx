import { useRef, useState } from 'react';
import { MdCheckCircle, MdClose, MdWarningAmber } from 'react-icons/md';

import type {
  AttendanceReviewCandidateResponse,
  AttendanceReviewDecision,
} from '@gps-attendance/shared';

import { ATTENDANCE_REVIEW_REASON_LABEL_KEYS } from '../../config/attendance-review';
import { useTranslation } from '../../hooks/useTranslation';
import { Dialog } from '../ui/Dialog';

type AttendanceReviewDecisionDialogProps = {
  candidate: AttendanceReviewCandidateResponse;
  decision: AttendanceReviewDecision;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

const MAX_REASON_LENGTH = 500;

export const AttendanceReviewDecisionDialog = ({
  candidate,
  decision,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: AttendanceReviewDecisionDialogProps) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const isApprove = decision === 'approve';
  const normalizedReason = reason.trim();

  return (
    <Dialog
      ariaLabel={t(
        isApprove
          ? 'attendanceReview.dialog.approveTitle'
          : 'attendanceReview.dialog.rejectTitle',
      )}
      canClose={!isSubmitting}
      onClose={onClose}
      initialFocusRef={reasonRef}
      panelClassName="max-w-xl"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(normalizedReason);
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                isApprove
                  ? 'bg-positive-soft text-positive'
                  : 'bg-danger-soft text-danger'
              }`}
            >
              {isApprove ? (
                <MdCheckCircle className="text-xl" />
              ) : (
                <MdWarningAmber className="text-xl" />
              )}
            </span>
            <div>
              <h2 className="text-[15px] font-extrabold text-ink">
                {t(
                  isApprove
                    ? 'attendanceReview.dialog.approveTitle'
                    : 'attendanceReview.dialog.rejectTitle',
                )}
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {t(
                  isApprove
                    ? 'attendanceReview.dialog.approveDescription'
                    : 'attendanceReview.dialog.rejectDescription',
                  { name: candidate.student.fullname },
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label={t('attendanceReview.dialog.close')}
            disabled={isSubmitting}
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-40"
          >
            <MdClose aria-hidden="true" className="text-lg" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg border border-line bg-surface-subtle p-3">
            <p className="text-[12px] font-extrabold text-ink">
              {candidate.student.fullname}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {candidate.student.code}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {candidate.reasons.map((reviewReason) => (
                <span
                  key={reviewReason}
                  className="rounded-md bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning"
                >
                  {t(ATTENDANCE_REVIEW_REASON_LABEL_KEYS[reviewReason])}
                </span>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="flex items-center justify-between gap-3 text-[11px] font-bold text-muted">
              {t('attendanceReview.dialog.note')}
              <span className="font-medium tabular-nums text-muted-soft">
                {reason.length}/{MAX_REASON_LENGTH}
              </span>
            </span>
            <textarea
              ref={reasonRef}
              value={reason}
              maxLength={MAX_REASON_LENGTH}
              rows={4}
              disabled={isSubmitting}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('attendanceReview.dialog.notePlaceholder')}
              className="mt-1.5 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-muted-soft focus:border-accent-strong focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
            />
          </label>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-[11px] font-semibold text-danger"
            >
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-subtle/55 px-5 py-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="min-h-9 rounded-lg border border-line bg-surface px-4 text-[11px] font-extrabold text-ink transition-colors hover:border-accent-strong/40 disabled:opacity-45"
          >
            {t('attendanceReview.dialog.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`min-h-9 rounded-lg border px-4 text-[11px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 ${
              isApprove
                ? 'border-positive bg-positive'
                : 'border-danger bg-danger'
            }`}
          >
            {isSubmitting
              ? t('attendanceReview.resolving')
              : t(
                  isApprove
                    ? 'attendanceReview.dialog.confirmApprove'
                    : 'attendanceReview.dialog.confirmReject',
                )}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
