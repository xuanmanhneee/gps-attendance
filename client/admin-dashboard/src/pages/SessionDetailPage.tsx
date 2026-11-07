import { useEffect, useState } from 'react';
import {
  MdRefresh,
  MdLockClock,
  MdCancel,
  MdDeleteForever,
  MdFileDownload,
} from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';

import type {
  AttendanceReviewReason,
  AttendanceSessionDetailResponse,
} from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import { deviceTrustApi } from '../api/device-trust.api';
import { toast } from 'react-toastify';
import { ConfirmModal } from '../components/ConfirmModal';
import { Pagination } from '../components/Pagination';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorFallback } from '../components/ErrorFallback';
import { useAuth } from '../hooks/useAuth';

const PARTICIPANTS_PAGE_SIZE = 10;
const ATTEMPTS_PAGE_SIZE = 10;

const reasonLabels: Record<string, string> = {
  OUT_OF_RANGE: 'Vượt quá bán kính cho phép',
  MOCK_LOCATION: 'Sử dụng ứng dụng giả lập GPS',
  DUPLICATE_DEVICE: 'Thiết bị đã điểm danh cho sinh viên khác',
  TOO_MANY_ATTEMPTS: 'Đã vượt quá số lần thử cho phép (3 lần)',
  LOW_CONFIDENCE_SCORE: 'Độ tin cậy vị trí thấp',
  LOW_LOCATION_ACCURACY: 'Sai số GPS lớn, vị trí chưa chắc chắn nằm gọn trong phạm vi',
  UNCERTAIN_BOUNDARY: 'Vị trí ở vùng biên Geofence',
  NEAR_LECTURER: '🎯 Ở gần giảng viên (Khuyến nghị duyệt)',
  FAR_FROM_LECTURER: '⚠️ Ở xa vị trí giảng viên',
  NO_LECTURER_LOCATION: 'Chưa có GPS đối chiếu từ giảng viên',
  DEVICE_UNVERIFIED: 'Thiết bị chưa được admin xác minh',
  DEVICE_BLOCKED: 'Thiết bị đã bị admin chặn',
};

const reviewReasonLabels: Record<AttendanceReviewReason, string> = {
  OUTSIDE_GEOFENCE: 'Ngoài vùng địa lý',
  GPS_INACCURATE: 'GPS không đủ chính xác',
  MOCK_LOCATION: 'Có dấu hiệu mock GPS',
  DEVICE_ISSUE: 'Vấn đề thiết bị',
  OTHER: 'Lý do khác',
};

const auditEventLabels: Record<string, string> = {
  SESSION_CREATED: 'Tạo phiên',
  SESSION_ASSIGNED: 'Gán sinh viên',
  CHECK_IN_ATTEMPT: 'Nỗ lực điểm danh',
  GPS_VALIDATED: 'GPS hợp lệ',
  GPS_REVIEW: 'GPS cần xem xét',
  GPS_REJECTED: 'GPS bị từ chối',
  DEVICE_REJECTED: 'Thiết bị bị từ chối',
  ATTEMPT_REJECTED: 'Từ chối do giới hạn lượt thử',
  REVIEW_DECISION: 'Quyết định giảng viên',
  RECORD_UPDATED: 'Cập nhật bản ghi',
};

const formatReason = (reason: string) => reasonLabels[reason] ?? reason;

const normalizeSessionDetail = (
  data: AttendanceSessionDetailResponse,
): AttendanceSessionDetailResponse => ({
  ...data,
  participants: Array.isArray(data.participants) ? data.participants : [],
  attempts: Array.isArray(data.attempts) ? data.attempts : [],
});

const SessionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] =
    useState<AttendanceSessionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [reviewSubmittingId, setReviewSubmittingId] = useState<number | null>(null);
  const [deviceUpdatingId, setDeviceUpdatingId] = useState<number | null>(null);

  // Pagination states
  const [participantPage, setParticipantPage] = useState(1);
  const [attemptPage, setAttemptPage] = useState(1);

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'close' | 'cancel' | 'delete';
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
      setSession(normalizeSessionDetail(data));
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
      const data = normalizeSessionDetail(
        await attendanceSessionsApi.getDetail(session.id),
      );
      setSession((current) => (current?.id === data.id ? data : current));
    } catch {
      setRefreshError(
        'Không thể tải lại danh sách sinh viên. Vui lòng thử lại.',
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReviewAttempt = async (
    attemptId: number,
    decision: 'APPROVED' | 'REJECTED',
  ) => {
    if (!session || reviewSubmittingId !== null) return;
    let reviewReason: AttendanceReviewReason | undefined;
    if (decision === 'REJECTED') {
      const reason = window.prompt(
        `Chọn mã lý do từ chối:\n${Object.entries(reviewReasonLabels)
          .map(([code, label]) => `${code}: ${label}`)
          .join('\n')}`,
        'OTHER',
      );
      if (reason === null) return;
      if (!(reason in reviewReasonLabels)) {
        window.alert('Mã lý do không hợp lệ.');
        return;
      }
      reviewReason = reason as AttendanceReviewReason;
    }
    const note = window.prompt(
      decision === 'APPROVED'
        ? 'Ghi chú lý do duyệt điểm danh:'
        : 'Ghi chú lý do từ chối điểm danh:',
    );
    if (note === null) return;
    if (note.trim().length < 3) {
      window.alert('Ghi chú cần có ít nhất 3 ký tự để lưu nhật ký xử lý.');
      return;
    }

    try {
      setReviewSubmittingId(attemptId);
      await attendanceSessionsApi.reviewAttempt(
        session.id,
        attemptId,
        decision,
        note.trim(),
        reviewReason,
      );
      const updated = normalizeSessionDetail(
        await attendanceSessionsApi.getDetail(session.id),
      );
      setSession(updated);
    } catch (reviewError) {
      console.error('Không thể xử lý lượt điểm danh:', reviewError);
      window.alert('Không thể lưu quyết định. Vui lòng tải lại phiên và thử lại.');
    } finally {
      setReviewSubmittingId(null);
    }
  };

  const handleDeviceTrust = async (
    registeredDeviceId: number,
    trustStatus: 'TRUSTED' | 'BLOCKED',
  ) => {
    const note = window.prompt(
      trustStatus === 'TRUSTED'
        ? 'Ghi chú xác minh thiết bị:'
        : 'Ghi chú lý do chặn thiết bị:',
      '',
    );
    if (note === null) return;
    try {
      setDeviceUpdatingId(registeredDeviceId);
      await attendanceSessionsApi.updateDeviceTrust(
        registeredDeviceId,
        trustStatus,
        note.trim() || undefined,
      );
      setSession(
        normalizeSessionDetail(await attendanceSessionsApi.getDetail(Number(id))),
      );
    } catch (trustError) {
      console.error('Không cập nhật được device trust:', trustError);
      window.alert('Không cập nhật được trạng thái thiết bị.');
    } finally {
      setDeviceUpdatingId(null);
    }
  };

  const handleResetDevice = async (
    registeredDeviceId: number,
    userCode: string,
  ) => {
    const note = window.prompt(
      `Xác nhận gỡ thiết bị cũ cho sinh viên (${userCode}) để sinh viên liên kết điện thoại mới? Nhập ghi chú nếu có:`,
      'Sinh viên đổi điện thoại',
    );
    if (note === null) return;
    try {
      setDeviceUpdatingId(registeredDeviceId);
      await deviceTrustApi.resetDevice(registeredDeviceId, note.trim() || undefined);
      toast.success(`Đã gỡ thiết bị cũ cho sinh viên (${userCode}). Sinh viên có thể dùng điện thoại mới điểm danh lại ngay!`);
      setSession(
        normalizeSessionDetail(await attendanceSessionsApi.getDetail(Number(id))),
      );
    } catch (err) {
      console.error('Lỗi khi đặt lại thiết bị:', err);
      toast.error('Không thể đặt lại thiết bị cho sinh viên.');
    } finally {
      setDeviceUpdatingId(null);
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
      } else if (modalState.type === 'cancel') {
        const updated = await attendanceSessionsApi.cancel(session.id);
        setSession((prev) =>
          prev ? { ...prev, ...updated, status: 'cancelled' } : null,
        );
        setModalState({ isOpen: false, type: 'cancel', isSubmitting: false });
      }
    } catch (err) {
      console.error('Lỗi khi thực hiện thao tác:', err);
      setModalState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleExportCSV = () => {
    if (!session || !session.participants || session.participants.length === 0) {
      alert('Không có dữ liệu sinh viên để xuất.');
      return;
    }

    const headers = [
      'STT',
      'Mã SV',
      'Họ và tên',
      'Trạng thái',
      'Thời gian điểm danh',
      'Khoảng cách (m)',
      'Mã thiết bị',
    ];

    const attemptsMap = new Map<string, NonNullable<typeof session.attempts>[0]>();
    for (const attempt of session.attempts ?? []) {
      if (!attemptsMap.has(attempt.userCode)) {
        attemptsMap.set(attempt.userCode, attempt);
      }
    }

    const rows = (Array.isArray(session.participants) ? session.participants : []).map((p, index) => {
      const attempt = attemptsMap.get(p.user.code);
      const isPresent = p.status === 'present';
      const statusText = isPresent
        ? 'Có mặt'
        : attempt && attempt.result === 'REJECTED'
          ? 'Bị từ chối'
          : attempt && attempt.result === 'REVIEW'
            ? 'Cần xem xét'
            : 'Vắng mặt';

      return [
        (index + 1).toString(),
        `"${p.user.code}"`,
        `"${p.user.fullname}"`,
        `"${statusText}"`,
        p.checkedInAt
          ? `"${new Date(p.checkedInAt).toLocaleString('vi-VN')}"`
          : 'Chưa điểm danh',
        attempt ? `${attempt.distanceToCenter}` : 'N/A',
        `"${attempt?.deviceId ?? 'N/A'}"`,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `DiemDanh_Phien_${session.id}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    cancelled: 'bg-rose-100 text-rose-700',
  };

  const statusLabels = {
    open: '🟢 Đang diễn ra',
    pending: '⏳ Sắp diễn ra',
    closed: '⚫ Đã kết thúc',
    cancelled: '⛔ Đã hủy',
  };

  // Pagination computations
  const participants = Array.isArray(session.participants) ? session.participants : [];
  const totalParticipantPages = Math.ceil(
    participants.length / PARTICIPANTS_PAGE_SIZE,
  );
  const pagedParticipants = participants.slice(
    (participantPage - 1) * PARTICIPANTS_PAGE_SIZE,
    participantPage * PARTICIPANTS_PAGE_SIZE,
  );

  const attemptsList = session.attempts ?? [];
  const hasAuditEvidence =
    attemptsList.length > 0 || (session.historyEvents?.length ?? 0) > 0;
  const totalAttemptPages = Math.ceil(
    attemptsList.length / ATTEMPTS_PAGE_SIZE,
  );
  const pagedAttempts = attemptsList.slice(
    (attemptPage - 1) * ATTEMPTS_PAGE_SIZE,
    attemptPage * ATTEMPTS_PAGE_SIZE,
  );

  // Map student code to latest attempt for showing rejection/review reasons
  const studentAttemptMap = new Map<string, (typeof attemptsList)[0]>();
  const attemptCountByStudent = new Map<string, number>();
  for (const attempt of attemptsList) {
    if (!studentAttemptMap.has(attempt.userCode)) {
      studentAttemptMap.set(attempt.userCode, attempt);
    }
    attemptCountByStudent.set(
      attempt.userCode,
      (attemptCountByStudent.get(attempt.userCode) ?? 0) + 1,
    );
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

            {(session.status === 'pending' || session.status === 'open') && (
              <button
                type="button"
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    type: 'cancel',
                    isSubmitting: false,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <MdCancel className="h-4 w-4" />
                Hủy phiên
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
            >
              <MdFileDownload className="h-4 w-4" />
              Xuất danh sách (Excel)
            </button>

            <button
              type="button"
              disabled={hasAuditEvidence}
              title={hasAuditEvidence ? 'Session có audit/evidence nên không thể xóa' : 'Xóa phiên chưa có evidence'}
              onClick={() =>
                setModalState({
                  isOpen: true,
                  type: 'delete',
                  isSubmitting: false,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MdDeleteForever className="h-4 w-4" />
              {hasAuditEvidence ? 'Giữ audit' : 'Xóa phiên'}
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

          <div className="grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-5 md:p-5">
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
              <p className="text-xs text-slate-500 font-medium">Phòng / tòa</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {session.location?.room?.code ?? '—'} / {session.location?.building?.code ?? 'MANUAL'}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500 font-medium">Tâm session (snapshot)</p>
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
                {participants.length} sinh viên
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

          {participants.length === 0 ? (
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
                  const isReview = studentAttempt?.result === 'REVIEW';

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

                        {isReview && studentAttempt && (
                          <div className="mt-1.5">
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs text-amber-800 border border-amber-200">
                              <span className="font-bold">⚠️ Cần xem xét:</span>
                              <span>
                                {studentAttempt.reasons && studentAttempt.reasons.length > 0
                                  ? studentAttempt.reasons.map(formatReason).join(', ')
                                  : 'Có dấu hiệu bất thường'}
                              </span>
                            </div>
                            <div className="mt-1.5 text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5">
                              <span>Distance {studentAttempt.distanceToCenter}m · Accuracy ±{studentAttempt.accuracy}m · Radius {session.radius}m · Mock GPS {studentAttempt.isMockLocation ? 'YES' : 'NO'} · Device {studentAttempt.deviceTrustStatus ?? 'UNVERIFIED'} · {attemptCountByStudent.get(studentAttempt.userCode) ?? 1} lần thử</span>
                              {studentAttempt.distanceToLecturer != null && (
                                <span className={`inline-flex items-center gap-1 font-semibold ${
                                  studentAttempt.lecturerProximityVerdict === 'NEAR' || studentAttempt.reasons?.includes('NEAR_LECTURER')
                                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5'
                                    : 'text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5'
                                }`}>
                                  {studentAttempt.lecturerProximityVerdict === 'NEAR' || studentAttempt.reasons?.includes('NEAR_LECTURER')
                                    ? `🎯 Cách GV: ${studentAttempt.distanceToLecturer}m (Gần GV)`
                                    : `⚠️ Cách GV: ${studentAttempt.distanceToLecturer}m (Xa GV)`}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleReviewAttempt(studentAttempt.id, 'APPROVED')}
                                disabled={reviewSubmittingId !== null}
                                className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {reviewSubmittingId === studentAttempt.id ? 'Đang lưu...' : 'Duyệt có mặt'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewAttempt(studentAttempt.id, 'REJECTED')}
                                disabled={reviewSubmittingId !== null}
                                className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isReview
                              ? 'bg-amber-100 text-amber-800'
                              : isPresent
                              ? 'bg-emerald-100 text-emerald-700'
                              : isRejected
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isReview
                            ? '⚠️ Chờ duyệt'
                            : isPresent
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
                  totalItems={participants.length}
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
                      <th className="px-4 py-3">Trust</th>
                      <th className="px-4 py-3">Lần thử</th>
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
                          {attempt.reviewedAt && (
                            <p className="mt-1 max-w-48 text-[11px] text-slate-500">
                              Đã xử lý {new Date(attempt.reviewedAt).toLocaleString('vi-VN')}
                              {attempt.reviewedBy ? ` · GV #${attempt.reviewedBy}` : ''}
                              {attempt.reviewNote ? ` · ${attempt.reviewNote}` : ''}
                            </p>
                          )}
                          {attempt.reviewReason && (
                            <p className="mt-1 max-w-48 text-[11px] text-slate-500">
                              Lý do duyệt: {reviewReasonLabels[attempt.reviewReason as AttendanceReviewReason] ?? attempt.reviewReason}
                            </p>
                          )}
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
                        <td className="px-4 py-2.5 text-xs text-amber-700">
                          <span className={attempt.deviceTrustStatus === 'TRUSTED' ? 'text-emerald-700' : attempt.deviceTrustStatus === 'BLOCKED' ? 'text-rose-700' : 'text-amber-700'}>
                            {attempt.deviceTrustStatus ?? 'UNVERIFIED'}
                          </span>
                          {(user?.role === 'admin' || user?.role === 'organizer') && attempt.registeredDeviceId && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {attempt.deviceTrustStatus !== 'TRUSTED' && (
                                <button
                                  type="button"
                                  disabled={deviceUpdatingId === attempt.registeredDeviceId}
                                  onClick={() => void handleDeviceTrust(attempt.registeredDeviceId!, 'TRUSTED')}
                                  className="rounded bg-emerald-50 hover:bg-emerald-100 px-1.5 py-1 text-[10px] font-semibold text-emerald-800 disabled:opacity-50"
                                  title="Duyệt tin cậy thiết bị này"
                                >Trust</button>
                              )}
                              {attempt.deviceTrustStatus !== 'BLOCKED' && (
                                <button
                                  type="button"
                                  disabled={deviceUpdatingId === attempt.registeredDeviceId}
                                  onClick={() => void handleDeviceTrust(attempt.registeredDeviceId!, 'BLOCKED')}
                                  className="rounded bg-rose-50 hover:bg-rose-100 px-1.5 py-1 text-[10px] font-semibold text-rose-800 disabled:opacity-50"
                                  title="Chặn thiết bị này"
                                >Block</button>
                              )}
                              <button
                                type="button"
                                disabled={deviceUpdatingId === attempt.registeredDeviceId}
                                onClick={() => void handleResetDevice(attempt.registeredDeviceId!, attempt.userCode)}
                                className="rounded bg-blue-50 hover:bg-blue-100 px-1.5 py-1 text-[10px] font-semibold text-blue-800 disabled:opacity-50"
                                title="Gỡ thiết bị cũ để sinh viên đổi điện thoại mới"
                              >Đổi máy</button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-700">
                          {attemptCountByStudent.get(attempt.userCode) ?? 1}
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

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 md:px-6">
            <h2 className="text-base font-bold text-slate-900">Audit timeline</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Lịch sử append-only; raw attempt vẫn được giữ kể cả sau quyết định review.
            </p>
          </div>
          {(session.historyEvents ?? []).length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Chưa có history event.</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {(session.historyEvents ?? []).map((event) => (
                <li key={event.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {auditEventLabels[event.eventType] ?? event.eventType}
                      {event.attemptId ? ` · Attempt #${event.attemptId}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {event.reasons.map(formatReason).join(', ')}
                      {event.reviewReason
                        ? ` · Lý do review: ${reviewReasonLabels[event.reviewReason as AttendanceReviewReason] ?? event.reviewReason}`
                        : ''}
                    </p>
                    {event.note && <p className="mt-1 text-xs text-slate-500">{event.note}</p>}
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <p>{new Date(event.createdAt).toLocaleString('vi-VN')}</p>
                    <p>{event.actorName ?? 'System'}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Modal xác nhận Đóng / Hủy / Xóa Session */}
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={
            modalState.type === 'delete'
              ? 'Xác nhận xóa phiên điểm danh'
              : modalState.type === 'cancel'
                ? 'Xác nhận hủy phiên điểm danh'
                : 'Xác nhận kết thúc phiên điểm danh'
          }
          message={
            modalState.type === 'delete'
              ? `Bạn có chắc chắn muốn xóa phiên "${session.title}"? Toàn bộ dữ liệu điểm danh và nhật ký đối soát sẽ bị xóa vĩnh viễn.`
              : modalState.type === 'cancel'
                ? `Bạn có chắc chắn muốn hủy phiên "${session.title}"? Phiên sẽ không thể tiếp tục nhận điểm danh.`
                : `Bạn có chắc chắn muốn đóng phiên "${session.title}" ngay bây giờ? Sinh viên sẽ không thể tiếp tục gửi yêu cầu điểm danh cho phiên này.`
          }
          confirmText={
            modalState.type === 'delete'
              ? 'Xóa vĩnh viễn'
              : modalState.type === 'cancel'
                ? 'Hủy phiên'
                : 'Đóng phiên ngay'
          }
          cancelText="Hủy bỏ"
          variant={modalState.type === 'close' ? 'warning' : 'danger'}
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
