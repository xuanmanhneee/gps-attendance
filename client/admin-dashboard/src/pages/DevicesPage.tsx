import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import DashboardSidebar from '../components/DashboardSidebar';
import { Pagination } from '../components/Pagination';
import {
  deviceTrustApi,
  type RegisteredDeviceItem,
  type ReplaceDevicePayload,
} from '../api/device-trust.api';

type FilterStatus = 'ALL' | 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED';

export default function DevicesPage() {
  const { user, logout } = useAuth();

  const [devices, setDevices] = useState<RegisteredDeviceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  // Action states
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Modal đổi máy / thay thế thiết bị
  const [selectedDevice, setSelectedDevice] = useState<RegisteredDeviceItem | null>(null);
  const [modalMode, setModalMode] = useState<'reset' | 'replace'>('reset');
  const [newModel, setNewModel] = useState('');
  const [newPlatform, setNewPlatform] = useState('android');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [note, setNote] = useState('');
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await deviceTrustApi.list({
        search: search.trim() || undefined,
        trustStatus: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: pageSize,
      });
      setDevices(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Lỗi khi tải danh sách thiết bị:', err);
      toast.error('Không thể tải danh sách thiết bị.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    let unverified = 0;
    let trusted = 0;
    let blocked = 0;
    for (const d of devices) {
      if (d.trustStatus === 'UNVERIFIED') unverified++;
      else if (d.trustStatus === 'TRUSTED') trusted++;
      else if (d.trustStatus === 'BLOCKED') blocked++;
    }
    return { unverified, trusted, blocked };
  }, [devices]);

  const handleTrustChange = async (
    deviceId: number,
    newStatus: 'TRUSTED' | 'BLOCKED' | 'UNVERIFIED',
  ) => {
    const promptMsg =
      newStatus === 'TRUSTED'
        ? 'Xác nhận DUYỆT TIN CẬY thiết bị này? Nhập ghi chú nếu có:'
        : newStatus === 'BLOCKED'
          ? 'Xác nhận CHẶN thiết bị này? Nhập lý do chặn:'
          : 'Chuyển về trạng thái CHƯA DUYỆT?';
    const noteInput = window.prompt(promptMsg, '');
    if (noteInput === null) return;

    try {
      setUpdatingId(deviceId);
      await deviceTrustApi.updateTrust(deviceId, newStatus, noteInput.trim() || undefined);
      toast.success(
        newStatus === 'TRUSTED'
          ? 'Đã duyệt tin cậy thiết bị thành công!'
          : newStatus === 'BLOCKED'
            ? 'Đã chặn thiết bị thành công!'
            : 'Đã cập nhật trạng thái thiết bị.',
      );
      void loadDevices();
    } catch (err) {
      console.error('Lỗi cập nhật device trust:', err);
      toast.error('Không thể cập nhật trạng thái thiết bị.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenChangeDeviceModal = (device: RegisteredDeviceItem) => {
    setSelectedDevice(device);
    setModalMode('reset');
    setNewModel('');
    setNewPlatform(device.platform || 'android');
    setNewDeviceId('');
    setNote(`Sinh viên ${device.userFullname} (${device.userCode}) đổi điện thoại`);
  };

  const handleCloseModal = () => {
    setSelectedDevice(null);
    setIsSubmittingModal(false);
  };

  const handleSubmitChangeDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;

    try {
      setIsSubmittingModal(true);
      if (modalMode === 'reset') {
        // Đặt lại thiết bị để sinh viên liên kết máy mới
        await deviceTrustApi.resetDevice(selectedDevice.id, note.trim() || undefined);
        toast.success(
          `Đã đặt lại thiết bị cho sinh viên ${selectedDevice.userFullname}. Sinh viên có thể dùng điện thoại mới điểm danh.`,
        );
      } else {
        // Cập nhật thông tin máy mới trực tiếp
        const payload: ReplaceDevicePayload = {
          newModel: newModel.trim() || undefined,
          newPlatform: newPlatform.trim() || undefined,
          newDeviceId: newDeviceId.trim() || undefined,
          trustStatus: 'TRUSTED',
          note: note.trim() || undefined,
        };
        await deviceTrustApi.replaceDevice(selectedDevice.id, payload);
        toast.success(
          `Đã cập nhật thiết bị mới và cấp quyền Tin cậy cho sinh viên ${selectedDevice.userFullname}!`,
        );
      }
      handleCloseModal();
      void loadDevices();
    } catch (err) {
      console.error('Lỗi khi đổi thiết bị:', err);
      toast.error('Không thể thực hiện thao tác đổi thiết bị.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.info('Đã sao chép mã thiết bị!');
  };

  return (
    <div className="flex h-screen bg-[#0e1017] text-gray-100 font-sans">
      <DashboardSidebar user={user} onLogout={logout} />

      <main className="flex-1 overflow-y-auto bg-[#141721] p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              📱 Quản lý thiết bị & Đăng ký chính chủ
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Kiểm soát thiết bị sinh viên theo cơ chế <strong>Device Trust</strong>. Duyệt tin cậy máy đầu kỳ và hỗ trợ cập nhật khi sinh viên đổi điện thoại.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDevices()}
            disabled={isLoading}
            className="self-start md:self-auto inline-flex items-center gap-2 rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors border border-gray-700"
          >
            🔄 {isLoading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
          <div className="bg-[#1b1f2e] border border-gray-800 rounded-xl p-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tổng thiết bị ghi nhận</span>
            <div className="mt-2 text-2xl font-bold text-white">{total}</div>
          </div>
          <div className="bg-[#1b1f2e] border border-gray-800 rounded-xl p-4">
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Đã xác minh (TRUSTED)</span>
            <div className="mt-2 text-2xl font-bold text-emerald-400">{stats.trusted}</div>
          </div>
          <div className="bg-[#1b1f2e] border border-gray-800 rounded-xl p-4">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Chờ phê duyệt (UNVERIFIED)</span>
            <div className="mt-2 text-2xl font-bold text-amber-400">{stats.unverified}</div>
          </div>
          <div className="bg-[#1b1f2e] border border-gray-800 rounded-xl p-4">
            <span className="text-xs font-medium text-rose-400 uppercase tracking-wider">Bị chặn (BLOCKED)</span>
            <div className="mt-2 text-2xl font-bold text-rose-400">{stats.blocked}</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-[#1a1d29] border border-gray-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="🔍 Tìm theo MSSV, tên SV, model máy, mã thiết bị..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg bg-[#12141d] border border-gray-700 px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Status Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {(
              [
                { key: 'ALL', label: 'Tất cả' },
                { key: 'UNVERIFIED', label: 'Chờ duyệt' },
                { key: 'TRUSTED', label: 'Đã tin cậy' },
                { key: 'BLOCKED', label: 'Bị chặn' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setStatusFilter(item.key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === item.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#12141d] text-gray-400 hover:text-gray-200 border border-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Device Table */}
        <div className="bg-[#1a1d29] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-[#161822] text-gray-400 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Sinh viên</th>
                  <th className="py-3 px-4">Thiết bị & Nền tảng</th>
                  <th className="py-3 px-4">Mã thiết bị (Device ID)</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4">Lần cuối thấy</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Đang tải danh sách thiết bị...
                    </td>
                  </tr>
                ) : devices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Không tìm thấy thiết bị nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => {
                    const isUnverified = device.trustStatus === 'UNVERIFIED';
                    const isTrusted = device.trustStatus === 'TRUSTED';
                    const isBlocked = device.trustStatus === 'BLOCKED';

                    return (
                      <tr
                        key={device.id}
                        className="hover:bg-[#1f2333]/50 transition-colors"
                      >
                        {/* Sinh viên */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-100">{device.userFullname}</div>
                          <div className="text-xs text-blue-400 font-mono mt-0.5">MSSV: {device.userCode}</div>
                          <div className="text-[11px] text-gray-500">{device.userEmail}</div>
                        </td>

                        {/* Model & Platform */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-200">
                            {device.model || 'Thiết bị không rõ model'}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                device.platform?.toLowerCase() === 'ios'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {device.platform?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </div>
                        </td>

                        {/* Device ID */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-mono text-xs text-gray-400 bg-[#12141d] px-2 py-1 rounded border border-gray-800 truncate max-w-[150px] inline-block"
                              title={device.deviceId}
                            >
                              {device.deviceId}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(device.deviceId)}
                              title="Sao chép Device ID"
                              className="text-gray-500 hover:text-gray-300 text-xs"
                            >
                              📋
                            </button>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {isTrusted && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 border border-emerald-700/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                              ✓ Tin cậy (TRUSTED)
                            </span>
                          )}
                          {isUnverified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 border border-amber-700/50 px-2.5 py-1 text-xs font-semibold text-amber-300">
                              ⏳ Chờ duyệt (UNVERIFIED)
                            </span>
                          )}
                          {isBlocked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-900/40 border border-rose-700/50 px-2.5 py-1 text-xs font-semibold text-rose-300">
                              ✕ Đã chặn (BLOCKED)
                            </span>
                          )}
                        </td>

                        {/* Last seen */}
                        <td className="py-3 px-4 text-xs text-gray-400">
                          <div>{new Date(device.lastSeenAt).toLocaleString('vi-VN')}</div>
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            Đăng ký: {new Date(device.firstSeenAt).toLocaleDateString('vi-VN')}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Nút Trust */}
                            {!isTrusted && (
                              <button
                                type="button"
                                disabled={updatingId === device.id}
                                onClick={() => void handleTrustChange(device.id, 'TRUSTED')}
                                className="rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 transition-colors disabled:opacity-50"
                              >
                                Duyệt Trust
                              </button>
                            )}

                            {/* Nút Block */}
                            {!isBlocked && (
                              <button
                                type="button"
                                disabled={updatingId === device.id}
                                onClick={() => void handleTrustChange(device.id, 'BLOCKED')}
                                className="rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/40 px-2.5 py-1 text-xs font-semibold text-rose-300 transition-colors disabled:opacity-50"
                              >
                                Chặn
                              </button>
                            )}

                            {/* Nút Đổi điện thoại */}
                            <button
                              type="button"
                              onClick={() => handleOpenChangeDeviceModal(device)}
                              className="rounded bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40 px-2.5 py-1 text-xs font-semibold text-blue-300 transition-colors"
                            >
                              🔄 Đổi máy
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-800 bg-[#161822]">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </main>

      {/* Modal Đổi điện thoại cho sinh viên */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#1b1e2c] border border-gray-700 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                🔄 Cập nhật / Đổi điện thoại cho sinh viên
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Thông tin sinh viên */}
            <div className="my-4 rounded-xl bg-[#12141f] border border-gray-800 p-3.5 text-xs text-gray-300 space-y-1">
              <div>
                <span className="text-gray-500">Sinh viên:</span>{' '}
                <strong className="text-white">{selectedDevice.userFullname}</strong> (MSSV: {selectedDevice.userCode})
              </div>
              <div>
                <span className="text-gray-500">Thiết bị hiện tại:</span>{' '}
                <span className="text-amber-300 font-medium">
                  {selectedDevice.model || 'Không rõ'} ({selectedDevice.platform})
                </span>
              </div>
              <div className="truncate">
                <span className="text-gray-500">Device ID:</span>{' '}
                <code className="text-gray-400">{selectedDevice.deviceId}</code>
              </div>
            </div>

            {/* Chọn chế độ đổi máy */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setModalMode('reset')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold text-center border transition-all ${
                  modalMode === 'reset'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-[#141622] border-gray-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                Cách 1: Cho phép tự liên kết máy mới (Reset)
              </button>
              <button
                type="button"
                onClick={() => setModalMode('replace')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold text-center border transition-all ${
                  modalMode === 'replace'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-[#141622] border-gray-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                Cách 2: Nhập thông tin máy mới thủ công
              </button>
            </div>

            <form onSubmit={handleSubmitChangeDevice}>
              {modalMode === 'reset' ? (
                <div className="rounded-xl bg-blue-950/20 border border-blue-800/40 p-4 mb-4 text-xs text-blue-200 space-y-2">
                  <p className="font-semibold text-blue-300">💡 Hướng dẫn quy trình:</p>
                  <p>
                    Hệ thống sẽ <strong>gỡ bỏ đăng ký của điện thoại cũ</strong>. Khi sinh viên đăng nhập và điểm danh bằng điện thoại mới, hệ thống sẽ tự động ghi nhận máy mới để giảng viên phê duyệt tin cậy.
                  </p>
                  <div className="mt-2">
                    <label className="block text-gray-300 font-medium mb-1">Ghi chú xác nhận đổi máy:</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Sinh viên đổi điện thoại mới do máy cũ bị mất/hỏng..."
                      className="w-full rounded-lg bg-[#12141f] border border-gray-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Tên Model máy mới (VD: iPhone 15, Samsung Galaxy S24):
                    </label>
                    <input
                      type="text"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="Nhập tên điện thoại mới..."
                      required
                      className="w-full rounded-lg bg-[#12141f] border border-gray-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Hệ điều hành:</label>
                    <select
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                      className="w-full rounded-lg bg-[#12141f] border border-gray-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="android">Android</option>
                      <option value="ios">iOS (iPhone/iPad)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Mã định danh thiết bị mới (Device ID - tùy chọn):
                    </label>
                    <input
                      type="text"
                      value={newDeviceId}
                      onChange={(e) => setNewDeviceId(e.target.value)}
                      placeholder="Để trống nếu sinh viên chưa biết mã thiết bị..."
                      className="w-full rounded-lg bg-[#12141f] border border-gray-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Ghi chú xác nhận:</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ghi chú xác thực..."
                      className="w-full rounded-lg bg-[#12141f] border border-gray-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmittingModal}
                  className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-50"
                >
                  {isSubmittingModal
                    ? 'Đang xử lý...'
                    : modalMode === 'reset'
                      ? 'Xác nhận gỡ thiết bị cũ'
                      : 'Lưu & Duyệt tin cậy máy mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
