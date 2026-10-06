import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AttendanceSessionResponse,
  SessionStatus,
} from '@gps-attendance/shared';

import { ConfirmModal } from './ConfirmModal';
import { Pagination } from './Pagination';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { toast } from 'react-toastify';
import { ApiError } from '@gps-attendance/shared';

interface SessionTableProps {
  sessions: AttendanceSessionResponse[];
  isLoading: boolean;
  onDelete: (id: number) => Promise<void>;
  onCloseSession?: (id: number) => Promise<void>;
  onCreateNew?: () => void;
}

const statusBadge: Record<SessionStatus, string> = {
  open: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  closed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-rose-100 text-rose-700',
};

const statusLabel: Record<SessionStatus, string> = {
  open: '🟢 Đang diễn ra',
  pending: '⏳ Sắp diễn ra',
  closed: '⚫ Đã kết thúc',
  cancelled: '⛔ Đã hủy',
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const groupSessionsByDate = (
  sessions: AttendanceSessionResponse[],
): Record<string, AttendanceSessionResponse[]> => {
  return sessions.reduce<Record<string, AttendanceSessionResponse[]>>(
    (groups, session) => {
      const date = new Date(session.openAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const currentSessions = groups[date] ?? [];

      return {
        ...groups,
        [date]: [...currentSessions, session],
      };
    },
    {},
  );
};

const PAGE_SIZE = 6;

const SessionTable = ({
  sessions,
  isLoading,
  onDelete,
  onCloseSession,
  onCreateNew,
}: SessionTableProps) => {
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    session: AttendanceSessionResponse | null;
    type: 'delete' | 'close';
    isSubmitting: boolean;
  }>({
    isOpen: false,
    session: null,
    type: 'delete',
    isSubmitting: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="Chưa có phiên điểm danh nào"
        description="Hiện tại chưa có phiên điểm danh nào trong hệ thống. Hãy nhấn 'Tạo phiên mới' để bắt đầu thiết lập buổi học và tọa độ GPS."
        actionLabel={onCreateNew ? '+ Tạo phiên mới' : undefined}
        onAction={onCreateNew}
      />
    );
  }

  const totalPages = Math.ceil(sessions.length / PAGE_SIZE);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const pagedSessions = sessions.slice(startIndex, startIndex + PAGE_SIZE);
  const sessionsByDate = groupSessionsByDate(pagedSessions);

  const openConfirmModal = (
    session: AttendanceSessionResponse,
    type: 'delete' | 'close',
  ) => {
    setModalState({
      isOpen: true,
      session,
      type,
      isSubmitting: false,
    });
  };

  const handleModalConfirm = async () => {
    if (!modalState.session) return;

    try {
      setModalState((prev) => ({ ...prev, isSubmitting: true }));
      if (modalState.type === 'delete') {
        await onDelete(modalState.session.id);
      } else if (modalState.type === 'close' && onCloseSession) {
        await onCloseSession(modalState.session.id);
      }
      setModalState((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Lỗi khi thực hiện thao tác:', err);
      toast.error(
        err instanceof ApiError && err.status === 429
          ? 'Bạn thao tác quá nhanh. Vui lòng đợi một chút rồi thử lại.'
          : err instanceof Error
            ? err.message
            : 'Không thực hiện được thao tác. Vui lòng thử lại.',
      );
    } finally {
      setModalState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {Object.entries(sessionsByDate).map(([date, dateSessions]) => (
          <section key={date} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              <h2 className="text-sm font-bold tracking-tight text-slate-700">
                {date}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dateSessions.map((session) => (
                <article
                  key={session.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs transition hover:shadow-md hover:border-slate-300"
                >
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3
                        className="font-bold text-slate-900 text-base line-clamp-1"
                        title={session.title}
                      >
                        {session.title}
                      </h3>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[session.status]}`}
                      >
                        {statusLabel[session.status]}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-400">🕒</span>
                        {formatDateTime(session.openAt)} –{' '}
                        {formatDateTime(session.closeAt)}
                      </p>

                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-400">📍</span>
                        Bán kính: <span className="font-semibold text-blue-600">{session.radius}m</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Chi tiết
                    </button>

                    <div className="flex items-center gap-1.5">
                      {session.status === 'open' && onCloseSession && (
                        <button
                          type="button"
                          onClick={() => openConfirmModal(session, 'close')}
                          className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          Đóng phiên
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openConfirmModal(session, 'delete')}
                        className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        totalItems={sessions.length}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => setCurrentPage(page)}
      />

      <ConfirmModal
        isOpen={modalState.isOpen}
        title={
          modalState.type === 'delete'
            ? 'Xác nhận xóa phiên điểm danh'
            : 'Xác nhận kết thúc phiên điểm danh'
        }
        message={
          modalState.type === 'delete'
            ? `Bạn có chắc chắn muốn xóa phiên "${modalState.session?.title}"? Toàn bộ bản ghi điểm danh và dữ liệu nhật ký kiểm toán liên quan sẽ bị xóa vĩnh viễn và không thể khôi phục.`
            : `Bạn có chắc chắn muốn đóng phiên "${modalState.session?.title}" ngay bây giờ? Sinh viên sẽ không thể tiếp tục gửi yêu cầu điểm danh cho phiên này.`
        }
        confirmText={
          modalState.type === 'delete' ? 'Xóa vĩnh viễn' : 'Đóng phiên ngay'
        }
        cancelText="Hủy bỏ"
        variant={modalState.type === 'delete' ? 'danger' : 'warning'}
        isLoading={modalState.isSubmitting}
        onConfirm={handleModalConfirm}
        onClose={() =>
          !modalState.isSubmitting &&
          setModalState((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};

export default SessionTable;
