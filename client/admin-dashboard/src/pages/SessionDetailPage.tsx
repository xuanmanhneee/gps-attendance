import { useEffect, useState } from 'react';
import { MdRefresh, MdLockClock, MdDeleteForever } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';

import type { AttendanceSessionDetailResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import { ConfirmModal } from '../components/ConfirmModal';
import { Pagination } from '../components/Pagination';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorFallback } from '../components/ErrorFallback';

const PARTICIPANTS_PAGE_SIZE = 10;
const ATTEMPTS_PAGE_SIZE = 10;

const reasonLabels: Record<string, string> = {
  OUT_OF_RANGE: 'Vượt quá bán kính cho phép',
  MOCK_LOCATION: 'Sử dụng ứng dụng giả lập GPS',
  DUPLICATE_DEVICE: 'Thiết bị đã điểm danh cho sinh viên khác',
  TOO_MANY_ATTEMPTS: 'Đã vượt quá số lần thử cho phép (3 lần)',
  LOW_CONFIDENCE_SCORE: 'Độ tin cậy vị trí thấp',
  LOW_LOCATION_ACCURACY: 'Sai số GPS lớn, vị trí chưa chắc chắn nằm gọn trong phạm vi',
};

const formatReason = (reason: string) => reasonLabels[reason] ?? reason;

const SessionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] =
    useState<AttendanceSessionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Pagination states
  const [participantPage, setParticipantPage] = useState(1);
  const [attemptPage, setAttemptPage] = useState(1);

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'close' | 'delete';
    isSubmitting: boolean;
  }>({
    isOpen: false,
    type: 'close',
    isSubmitting: false,
  });

  const loadSession = async () => {
    const sessionId = Number(id);

    if (!id || !Number.isInteger(sessionId) || sessionId <= 0) {
      setError('Mã phiên điểm danh không hợp lệ hoặc không tìm thấy.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await attendanceSessionsApi.getDetail(sessionId);
      setSession(data);
    } catch {
      setError('Không thể tải thông tin phiên điểm danh. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [id]);

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

  const handleConfirmAction = async () => {
    if (!session) return;

    try {
      setModalState((prev) => ({ ...prev, isSubmitting: true }));
      if (modalState.type === 'close') {
        const updated = await attendanceSessionsApi.close(session.id);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                ...updated,
                status: 'closed',
              }
            : null,
        );
        setModalState({ isOpen: false, type: 'close', isSubmitting: false });
      } else if (modalState.type === 'delete') {
        await attendanceSessionsApi.remove(session.id);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Lỗi khi thực hiện thao tác:', err);
      setModalState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <LoadingSkeleton type="detail" />
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <ErrorFallback
            title="Lỗi tải phiên điểm danh"
            message={error ?? 'Không tìm thấy dữ liệu phiên điểm danh này.'}
            onRetry={loadSession}
            onBack={() => navigate('/dashboard')}
          />
        </div>
      </main>
    );
  }

  const statusStyles = {
    open: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    closed: 'bg-slate-100 text-slate-600',
  };

  const statusLabels = {
    open: '🟢 Đang diễn ra',
    pending: '⏳ Sắp diễn ra',
    closed: '⚫ Đã kết thúc',
  };

  // Pagination computations
  const totalParticipantPages = Math.ceil(
    session.participants.length / PARTICIPANTS_PAGE_SIZE,
  );
  const pagedParticipants = session.participants.slice(
    (participantPage - 1) * PARTICIPANTS_PAGE_SIZE,
    participantPage * PARTICIPANTS_PAGE_SIZE,
  );

  const attemptsList = session.attempts ?? [];
  const totalAttemptPages = Math.ceil(
    attemptsList.length / ATTEMPTS_PAGE_SIZE,
  );
  const pagedAttempts = attemptsList.slice(
    (attemptPage - 1) * ATTEMPTS_PAGE_SIZE,
    attemptPage * ATTEMPTS_PAGE_SIZE,
  );

  // Map student code to latest attempt for showing rejection/review reasons
  const studentAttemptMap = new Map<string, (typeof attemptsList)[0]>();
  for (const attempt of attemptsList) {
    if (!studentAttemptMap.has(attempt.userCode)) {
      studentAttemptMap.set(attempt.userCode, attempt);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-blue-600"
          >
            ← Quay lại danh sách
          </button>

          <div className="flex items-center gap-2">
            {session.status === 'open' && (
              <button
                type="button"
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    type: 'close',
                    isSubmitting: false,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <MdLockClock className="h-4 w-4" />
                Đóng phiên ngay
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setModalState({
                  isOpen: true,
                  type: 'delete',
                  isSubmitting: false,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <MdDeleteForever className="h-4 w-4" />
              Xóa phiên
            </button>
          </div>
        </div>

        {/* Section: Session Information Card */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
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

          <div className="grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-4 md:p-5">
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500 font-medium">Thời gian mở</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {new Date(session.openAt).toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500 font-medium">Thời gian đóng</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {new Date(session.closeAt).toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500 font-medium">Bán kính điểm danh</p>
              <p className="mt-1 text-lg font-bold text-blue-600">
                {session.radius}m
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500 font-medium">Tọa độ tâm phòng học</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 font-mono">
                {session.latitude}, {session.longitude}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 px-5 py-3 md:px-6">
            <a
              href={`https://www.google.com/maps?q=${session.latitude},${session.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Mở vị trí trên Google Maps
            </a>
          </div>
        </section>

        {/* Section: Người tham gia & Chi tiết kết quả điểm danh */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 md:px-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Danh sách sinh viên trong lớp
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem trạng thái điểm danh và lý do bị từ chối nếu không hợp lệ
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                {session.participants.length} sinh viên
              </span>
              <button
                type="button"
                onClick={handleRefreshParticipants}
                disabled={isRefreshing}
                aria-label="Tải lại danh sách sinh viên"
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdRefresh
                  aria-hidden="true"
                  className={`text-base ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {refreshError && (
            <p role="alert" className="px-5 pt-3 text-xs text-rose-600 md:px-6 font-medium">
              {refreshError}
            </p>
          )}

          {session.participants.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Chưa có sinh viên tham gia"
                description="Không có sinh viên nào được gán vào danh sách lớp của phiên điểm danh này."
              />
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {pagedParticipants.map((participant) => {
                  const studentAttempt = studentAttemptMap.get(participant.user.code);
                  const isPresent = participant.status === 'present';
                  const isRejected = !isPresent && studentAttempt && studentAttempt.result === 'REJECTED';
                  const isReview = studentAttempt && studentAttempt.result === 'REVIEW';

                  return (
                    <div
                      key={participant.user.code}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 md:px-6 hover:bg-slate-50/70 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 text-sm">
                            {participant.user.fullname}
                          </p>
                          <span className="font-mono text-xs text-slate-400">
                            ({participant.user.code})
                          </span>
                        </div>

                        {/* Lý do từ chối check-in chi tiết */}
                        {isRejected && (
                          <div className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs text-rose-700 border border-rose-200">
                            <span className="font-bold">❌ Bị từ chối:</span>
                            <span>
                              {studentAttempt.reasons && studentAttempt.reasons.length > 0
                                ? studentAttempt.reasons.map(formatReason).join(', ')
                                : 'Vị trí hoặc thiết bị không hợp lệ'}
                            </span>
                            <span className="text-rose-500 font-mono">
                              (Cách lớp {studentAttempt.distanceToCenter}m, sai số ±{studentAttempt.accuracy}m)
                            </span>
                          </div>
                        )}

                        {isReview && !isPresent && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs text-amber-800 border border-amber-200">
                            <span className="font-bold">⚠️ Cần xem xét:</span>
                            <span>
                              {studentAttempt.reasons && studentAttempt.reasons.length > 0
                                ? studentAttempt.reasons.map(formatReason).join(', ')
                                : 'Có dấu hiệu bất thường'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isPresent
                              ? 'bg-emerald-100 text-emerald-700'
                              : isRejected
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isPresent
                            ? '✅ Đã điểm danh'
                            : isRejected
                            ? '❌ Điểm danh thất bại'
                            : '⏳ Chưa điểm danh'}
                        </span>
                        {participant.checkinAt && (
                          <p className="mt-1 text-xs text-slate-500 font-mono">
                            {new Date(participant.checkinAt).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 border-t border-slate-100">
                <Pagination
                  currentPage={participantPage}
                  totalPages={totalParticipantPages}
                  totalItems={session.participants.length}
                  pageSize={PARTICIPANTS_PAGE_SIZE}
                  onPageChange={(page) => setParticipantPage(page)}
                />
              </div>
            </>
          )}
        </section>

        {/* Section: Audit Log / Nhật ký kiểm toán phục vụ khiếu nại */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 md:px-6 bg-slate-50">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Nhật ký kiểm toán & Chống gian lận (Audit Log)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ghi nhận mọi lần bấm điểm danh, tọa độ, thiết bị và lý do từ chối để đối soát khiếu nại
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {attemptsList.length} lượt nỗ lực
            </span>
          </div>

          {attemptsList.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Chưa có nhật ký kiểm toán"
                description="Chưa có lượt nỗ lực điểm danh nào được ghi nhận trong phiên này."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-100/70 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Thời gian server</th>
                      <th className="px-4 py-3">Sinh viên</th>
                      <th className="px-4 py-3">Kết quả</th>
                      <th className="px-4 py-3">Khoảng cách / Sai số</th>
                      <th className="px-4 py-3">Mock GPS</th>
                      <th className="px-4 py-3">Thiết bị (Device ID)</th>
                      <th className="px-4 py-3">Lý do từ chối</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedAttempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-2.5 text-xs font-mono whitespace-nowrap text-slate-500">
                          {new Date(attempt.serverTimestamp).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-900 text-xs">{attempt.userFullname}</p>
                          <p className="text-xs text-slate-400 font-mono">{attempt.userCode}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                              attempt.result === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : attempt.result === 'REVIEW'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {attempt.result === 'APPROVED'
                              ? '✅ APPROVED'
                              : attempt.result === 'REVIEW'
                              ? '⚠️ REVIEW'
                              : '❌ REJECTED'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className="font-semibold text-slate-800">{attempt.distanceToCenter}m</span>
                          <span className="text-slate-400"> (bán kính {session.radius}m, ±{attempt.accuracy}m)</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {attempt.isMockLocation ? (
                            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              🚨 Mocked
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">Thật</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-600 truncate max-w-[140px]" title={attempt.deviceId}>
                          {attempt.deviceId}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-rose-600 font-medium">
                          {attempt.reasons && attempt.reasons.length > 0
                            ? attempt.reasons.map(formatReason).join(', ')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 border-t border-slate-100">
                <Pagination
                  currentPage={attemptPage}
                  totalPages={totalAttemptPages}
                  totalItems={attemptsList.length}
                  pageSize={ATTEMPTS_PAGE_SIZE}
                  onPageChange={(page) => setAttemptPage(page)}
                />
              </div>
            </>
          )}
        </section>

        {/* Modal xác nhận Đóng / Xóa Session */}
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={
            modalState.type === 'delete'
              ? 'Xác nhận xóa phiên điểm danh'
              : 'Xác nhận kết thúc phiên điểm danh'
          }
          message={
            modalState.type === 'delete'
              ? `Bạn có chắc chắn muốn xóa phiên "${session.title}"? Toàn bộ dữ liệu điểm danh và nhật ký đối soát sẽ bị xóa vĩnh viễn.`
              : `Bạn có chắc chắn muốn đóng phiên "${session.title}" ngay bây giờ? Sinh viên sẽ không thể tiếp tục gửi yêu cầu điểm danh cho phiên này.`
          }
          confirmText={
            modalState.type === 'delete' ? 'Xóa vĩnh viễn' : 'Đóng phiên ngay'
          }
          cancelText="Hủy bỏ"
          variant={modalState.type === 'delete' ? 'danger' : 'warning'}
          isLoading={modalState.isSubmitting}
          onConfirm={handleConfirmAction}
          onClose={() =>
            !modalState.isSubmitting &&
            setModalState((prev) => ({ ...prev, isOpen: false }))
          }
        />
      </div>
    </main>
  );
};

export default SessionDetailPage;
