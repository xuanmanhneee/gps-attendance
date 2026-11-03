import type { AttendanceSessionResponse } from '@gps-attendance/shared';
import { MdAccessTime, MdBlock, MdEdit, MdOutlinePlace } from 'react-icons/md';
import { Link } from 'react-router-dom';

import { useTranslation } from '../../hooks/useTranslation';
import {
  buildSessionEditPath,
  ROUTE_PATHS,
} from '../../routes/paths';
import { StatusBadge } from '../ui/StatusBadge';

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
};

const ICON_BUTTON_CLASS =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface transition-colors';

// Tooltip hiện khi hover hoặc focus bàn phím vào nút (group = wrapper của nút)
const TOOLTIP_CLASS =
  'pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-focus-within:opacity-100 group-hover:opacity-100';

type Props = {
  session: AttendanceSessionResponse;
  /** true khi người xem là organizer tạo phiên này */
  canManage?: boolean;
  isCancelling?: boolean;
  onCancel?: (session: AttendanceSessionResponse) => void;
};

export const SessionCard = ({
  session,
  canManage = false,
  isCancelling = false,
  onCancel,
}: Props) => {
  const { t } = useTranslation();
  const idParam = String(session.id);

  // Chỉ pending/open mới sửa hoặc huỷ được; closed/cancelled backend trả 409.
  const showActions =
    canManage && (session.status === 'pending' || session.status === 'open');

  const editLabel = t('sessions.card.edit');
  const cancelLabel = isCancelling
    ? t('sessions.card.cancelling')
    : t('sessions.card.cancel');

  return (
    // relative + stretched link: cả card bấm được mà không lồng nút trong <a>
    <div
      className={`relative flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm transition-all hover:border-accent-strong hover:shadow-md ${
        session.status === 'cancelled' ? 'opacity-70' : ''
      }`}
    >
      {/* Tiêu đề: luôn chừa chỗ 2 dòng để mọi thẻ cao bằng nhau */}
      <div className="flex min-h-[2.5rem] items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-ink">
          <Link
            to={ROUTE_PATHS.attendanceSessionDetail.replace(':id', idParam)}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent-soft"
          >
            {session.title}
          </Link>
        </h3>
        <div className="shrink-0">
          <StatusBadge status={session.status} />
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5 text-[12px] text-muted">
          <p className="flex items-center gap-2">
            <MdAccessTime
              aria-hidden="true"
              className="shrink-0 text-[15px] text-accent-strong"
            />
            <span className="font-medium text-ink">
              {formatTime(session.openAt)} – {formatTime(session.closeAt)}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <MdOutlinePlace
              aria-hidden="true"
              className="shrink-0 text-[15px] text-accent-strong"
            />
            <span>
              {t('sessions.table.radius')}:{' '}
              <span className="font-medium text-ink">{session.radius} m</span>
            </span>
          </p>
        </div>

        {showActions && (
          // z-10 để nằm trên lớp link phủ toàn card
          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            <div className="group relative">
              <Link
                to={buildSessionEditPath(session.id)}
                aria-label={editLabel}
                className={`${ICON_BUTTON_CLASS} text-ink hover:border-accent-strong hover:bg-accent-soft hover:text-accent-strong`}
              >
                <MdEdit aria-hidden="true" className="text-[16px]" />
              </Link>
              <span role="tooltip" className={TOOLTIP_CLASS}>
                {editLabel}
              </span>
            </div>
            <div className="group relative">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => onCancel?.(session)}
                aria-label={cancelLabel}
                className={`${ICON_BUTTON_CLASS} text-danger hover:border-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <MdBlock aria-hidden="true" className="text-[16px]" />
              </button>
              <span role="tooltip" className={TOOLTIP_CLASS}>
                {cancelLabel}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
