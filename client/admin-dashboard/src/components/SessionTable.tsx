import type {
  AttendanceSessionResponse,
  SessionStatus,
} from '@gps-attendance/shared';

import { useNavigate } from 'react-router-dom';

interface SessionTableProps {
  sessions: AttendanceSessionResponse[];
  isLoading: boolean;
}

const statusBadge: Record<SessionStatus, string> = {
  open: 'bg-green-100 text-green-600',
  pending: 'bg-gray-100 text-gray-500',
  closed: 'bg-gray-100 text-gray-400',
};

const statusLabel: Record<SessionStatus, string> = {
  open: 'Đang diễn ra',
  pending: 'Sắp diễn ra',
  closed: 'Đã kết thúc',
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

const SessionTable = ({ sessions, isLoading }: SessionTableProps) => {
  const navigate = useNavigate();
  if (isLoading) {
    return <p className="text-sm text-gray-500">Đang tải danh sách...</p>;
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Chưa có phiên điểm danh nào. Nhấn "Tạo phiên mới" để bắt đầu.
      </p>
    );
  }

  const sessionsByDate = groupSessionsByDate(sessions);

  return (
    <div className="space-y-5">
      {Object.entries(sessionsByDate).map(([date, dateSessions]) => (
        <section key={date}>
          <div className="mb-2 text-sm font-semibold text-gray-700">{date}</div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {dateSessions.map((session) => (
              <article
                key={session.id}
                className="min-w-[240px] rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">
                    {session.title}
                  </h2>

                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusBadge[session.status]}`}
                  >
                    {statusLabel[session.status]}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    {formatDateTime(session.openAt)} –{' '}
                    {formatDateTime(session.closeAt)}
                  </p>

                  <p>Bán kính: {session.radius}m</p>

                  <button
                    type="button"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    className="mt-4 inline-flex rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default SessionTable;
