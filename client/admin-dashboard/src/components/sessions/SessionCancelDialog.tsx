import { useRef } from 'react';

import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import { useTranslation } from '../../hooks/useTranslation';
import { Dialog } from '../ui/Dialog';

type SessionCancelDialogProps = {
  session: AttendanceSessionResponse | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export const SessionCancelDialog = ({
  session,
  isSubmitting,
  onConfirm,
  onClose,
}: SessionCancelDialogProps) => {
  const { t } = useTranslation();
  const keepRef = useRef<HTMLButtonElement>(null);

  if (!session) return null;

  const isOpen = session.status === 'open';
  const title = t(
    isOpen
      ? 'sessions.cancelDialog.titleOpen'
      : 'sessions.cancelDialog.titlePending',
  );
  const warning = t(
    isOpen
      ? 'sessions.cancelDialog.warningOpen'
      : 'sessions.cancelDialog.warningPending',
    { title: session.title },
  );

  return (
    <Dialog
      ariaLabel={title}
      canClose={!isSubmitting}
      onClose={onClose}
      initialFocusRef={keepRef}
      panelClassName="max-w-md"
    >
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-[15px] font-bold text-ink">
          {title}
        </h2>
      </div>

      <div className="flex flex-col gap-4 px-5 py-4">
        <p
          id="session-cancel-confirm"
          className="text-[13px] leading-relaxed text-ink"
        >
          {warning}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            ref={keepRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-line bg-surface-subtle px-4 py-2 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-50"
          >
            {t('sessions.cancelDialog.keep')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            aria-describedby="session-cancel-confirm"
            className="rounded-lg border border-danger bg-danger px-4 py-2 text-[12px] font-bold text-white transition-opacity disabled:opacity-50"
          >
            {isSubmitting
              ? t('sessions.card.cancelling')
              : t('sessions.cancelDialog.confirm')}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
