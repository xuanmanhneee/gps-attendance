import { useEffect, useState } from 'react';
import {
  MdAccessTime,
  MdLocationOn,
  MdMyLocation,
  MdRefresh,
} from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';

import type { AttendanceSessionDetailResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';

const formatSessionDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatSessionTime = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const SessionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] =
    useState<AttendanceSessionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefreshParticipants = async () => {
    if (!session || isRefreshing) return;

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const data = await attendanceSessionsApi.getDetail(session.id);
      setSession((current) => (current?.id === data.id ? data : current));
    } catch {
      setRefreshError(
        'Không thể tải lại danh sách sinh viên. Vui lòng thử lại.',
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      const sessionId = Number(id);

      if (!id || !Number.isInteger(sessionId) || sessionId <= 0) {
        setError('Không tìm thấy mã session');
        setIsLoading(false);
        return;
      }

      try {
        const data = await attendanceSessionsApi.getDetail(sessionId);
        setSession(data);
      } catch {
        setError('Không thể tải thông tin session');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [id]);

  if (isLoading) {
    return <p className="p-8">Đang tải thông tin session...</p>;
  }

  if (error || !session) {
    return (
      <main className="p-8">
        <p className="text-red-600">{error ?? 'Không tìm thấy session'}</p>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Quay lại dashboard
        </button>
      </main>
    );
  }

  const statusStyles = {
    open: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    closed: 'bg-gray-100 text-gray-600',
  };

  const statusLabels = {
    open: 'Đang diễn ra',
    pending: 'Sắp diễn ra',
    closed: 'Đã kết thúc',
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mb-4 text-sm font-medium text-slate-500 transition hover:text-blue-600"
        >
          ← Quay lại danh sách
        </button>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-5 text-white md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold">{session.title}</h1>
                  <span className="text-sm text-blue-100">#{session.id}</span>
                </div>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[session.status]}`}
              >
                {statusLabels[session.status]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-4 md:p-4">
            <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                  <MdAccessTime aria-hidden="true" size={16} />
                </span>
                Thời gian mở
              </div>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-1 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                {formatSessionDate(session.openAt)}
                <span> - {formatSessionTime(session.openAt)}</span>
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-orange-100 bg-orange-50/60 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm">
                  <MdAccessTime aria-hidden="true" size={16} />
                </span>
                Thời gian đóng
              </div>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-1 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                {formatSessionDate(session.closeAt)}
                <span> - {formatSessionTime(session.closeAt)}</span>
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                  <MdLocationOn aria-hidden="true" size={16} />
                </span>
                Bán kính điểm danh
              </div>
              <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                {session.radius}
                <span className="ml-1 text-base font-semibold text-slate-500">
                  m
                </span>
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Phạm vi cho phép
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                  <MdMyLocation aria-hidden="true" size={16} />
                </span>
                Tọa độ GPS
              </div>
              <p className="mt-3 break-all text-base font-bold tracking-tight text-slate-900">
                {session.latitude}, {session.longitude}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Vị trí điểm danh
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 px-5 py-3 md:px-6">
            <a
              href={`https://www.google.com/maps?q=${session.latitude},${session.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Mở vị trí trên Google Maps
            </a>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 md:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Người tham gia
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                {session.participants.length} người
              </span>
              <button
                type="button"
                onClick={handleRefreshParticipants}
                disabled={isRefreshing}
                aria-label="Tải lại danh sách sinh viên"
                className="inline-flex items-center gap-1.5 rounded-lg border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdRefresh
                  aria-hidden="true"
                  className={`text-lg ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>

          {refreshError && (
            <p role="alert" className="px-5 pt-3 text-sm text-red-600 md:px-6">
              {refreshError}
            </p>
          )}

          {session.participants.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500 md:px-6">
              Chưa có người tham gia trong session này.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {session.participants.map((participant) => (
                <div
                  key={participant.user.code}
                  className="flex items-center justify-between gap-4 px-5 py-2.5 md:px-6"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {participant.user.fullname}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Mã sinh viên: {participant.user.code}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      participant.status === 'present'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {participant.status === 'present'
                      ? 'Đã điểm danh'
                      : 'Chưa điểm danh'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default SessionDetailPage;
