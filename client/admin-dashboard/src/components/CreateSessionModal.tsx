import { useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { IoClose } from 'react-icons/io5';
import * as XLSX from 'xlsx';
import {
  MdMyLocation,
  MdLocationOn,
  MdAccessTime,
  MdGroup,
  MdOutlineTitle,
} from 'react-icons/md';
import { toast } from 'react-toastify';

export interface CreateSessionFormData {
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  openAt: string;
  closeAt: string;
  studentCodes: string;
}

interface CreateSessionFormValues
  extends Omit<CreateSessionFormData, 'openAt' | 'closeAt'> {
  openDate: string;
  openTime: string;
  closeDate: string;
  closeTime: string;
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (data: CreateSessionFormData) => void;
}

// Hàm chuyển đổi Date sang chuỗi YYYY-MM-DDTHH:mm theo giờ local (tránh bị lệch múi giờ UTC)
const formatDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const CreateSessionModal = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}: CreateSessionModalProps) => {
  const [gettingLocation, setGettingLocation] = useState(false);
  const [studentFileName, setStudentFileName] = useState('');
  const [studentCount, setStudentCount] = useState(0);

  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionFormValues>({
    defaultValues: {
      title: '',
      radius: 50,
      openDate: formatDateTimeLocal(now).split('T')[0],
      openTime: formatDateTimeLocal(now).split('T')[1],
      closeDate: formatDateTimeLocal(twoHoursLater).split('T')[0],
      closeTime: formatDateTimeLocal(twoHoursLater).split('T')[1],
      studentCodes: '',
    },
  });

  if (!isOpen) return null;

  // Lấy tọa độ GPS hiện tại từ trình duyệt
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', parseFloat(position.coords.latitude.toFixed(6)));
        setValue('longitude', parseFloat(position.coords.longitude.toFixed(6)));
        toast.success('Đã lấy tọa độ hiện tại thành công!');
        setGettingLocation(false);
      },
      (error) => {
        toast.error('Không thể lấy vị trí: ' + error.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true },
    );
  };

  const handleStudentFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: 'array',
      });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        toast.error('File Excel không có sheet dữ liệu');
        return;
      }

      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(firstSheet, {
        header: 1,
        defval: '',
        raw: false,
      });
      const codes = rows
        .map((row) => String(row[0] ?? '').trim())
        .filter(Boolean);
      const firstValue = codes[0]?.toLowerCase() ?? '';
      const studentCodes =
        firstValue.includes('mã') ||
        firstValue.includes('student') ||
        firstValue.includes('code')
          ? codes.slice(1)
          : codes;

      if (studentCodes.length === 0) {
        toast.error('Không tìm thấy mã sinh viên trong cột đầu tiên');
        return;
      }

      setValue('studentCodes', studentCodes.join(', '));
      setStudentFileName(file.name);
      setStudentCount(studentCodes.length);
      toast.success(`Đã đọc ${studentCodes.length} mã sinh viên`);
    } catch (error) {
      console.error('Không thể đọc file Excel:', error);
      toast.error('Không thể đọc file Excel');
    } finally {
      event.target.value = '';
    }
  };

  const handleFormSubmit = async (values: CreateSessionFormValues) => {
    try {
      const data: CreateSessionFormData = {
        ...values,
        openAt: `${values.openDate}T${values.openTime}`,
        closeAt: `${values.closeDate}T${values.closeTime}`,
      };

      if (new Date(data.openAt) >= new Date(data.closeAt)) {
        toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
        return;
      }

      // Xử lý callback khi submit
      if (onSubmitSuccess) {
        await onSubmitSuccess(data);
      }
      toast.success('Tạo phiên điểm danh thành công!');
      reset();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Có lỗi xảy ra khi tạo phiên');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Tạo phiên điểm danh mới
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cấu hình phạm vi GPS, thời gian và sinh viên áp dụng
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
        >
          {/* Section 1: Tên phiên */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <MdOutlineTitle className="text-blue-600 text-sm" />
              Tên phiên điểm danh / Môn học{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Lập trình Web - Tiết 1,2 (Thứ 2)"
              {...register('title', {
                required: 'Vui lòng nhập tên phiên điểm danh',
              })}
              className="w-full px-3.5 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Section 2: Tọa độ GPS & Bán kính */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <MdLocationOn className="text-blue-600 text-sm" />
                Vị trí & Bán kính GPS cho phép{' '}
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 cursor-pointer disabled:opacity-50"
              >
                <MdMyLocation />
                {gettingLocation ? 'Đang định vị...' : 'Lấy vị trí hiện tại'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Vĩ độ (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="21.028511"
                  {...register('latitude', {
                    required: 'Thiếu vĩ độ',
                    valueAsNumber: true,
                  })}
                  className="w-full px-3 py-1.5 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Kinh độ (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="105.804817"
                  {...register('longitude', {
                    required: 'Thiếu kinh độ',
                    valueAsNumber: true,
                  })}
                  className="w-full px-3 py-1.5 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Bán kính (mét)
                </label>
                <input
                  type="number"
                  placeholder="50"
                  {...register('radius', {
                    required: 'Thiếu bán kính',
                    min: 5,
                    valueAsNumber: true,
                  })}
                  className="w-full px-3 py-1.5 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Thời gian */}
          <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <MdAccessTime className="text-blue-600 text-sm" />
              <h3 className="text-sm font-semibold text-gray-700">
                Thời gian điểm danh
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-blue-100 bg-white p-3">
                <p className="mb-2 text-sm font-semibold text-blue-700">
                  Bắt đầu
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm text-gray-500">
                    Ngày
                    <input
                      type="date"
                      {...register('openDate', {
                        required: 'Vui lòng chọn ngày bắt đầu',
                      })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="text-sm text-gray-500">
                    Giờ
                    <input
                      type="time"
                      {...register('openTime', {
                        required: 'Vui lòng chọn giờ bắt đầu',
                      })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-amber-100 bg-white p-3">
                <p className="mb-2 text-sm font-semibold text-amber-700">
                  Kết thúc
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm text-gray-500">
                    Ngày
                    <input
                      type="date"
                      {...register('closeDate', {
                        required: 'Vui lòng chọn ngày kết thúc',
                      })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-base outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                  <label className="text-sm text-gray-500">
                    Giờ
                    <input
                      type="time"
                      {...register('closeTime', {
                        required: 'Vui lòng chọn giờ kết thúc',
                      })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-base outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Import danh sách mã SV từ Excel */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <MdGroup className="text-blue-600 text-sm" />
              Mã sinh viên được tham gia (tùy chọn)
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-3 transition hover:bg-blue-100">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  {studentFileName || 'Chọn file Excel danh sách sinh viên'}
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  Cột đầu tiên chứa mã sinh viên (.xlsx, .xls)
                </p>
              </div>
              <span className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">
                Chọn file
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleStudentFileChange}
                className="hidden"
              />
            </label>
            {studentCount > 0 && (
              <p className="mt-2 text-sm text-green-600">
                Đã import {studentCount} mã sinh viên
              </p>
            )}
            <input type="hidden" {...register('studentCodes')} />
            <span className="text-xs text-gray-400">
              Để trống nếu áp dụng cho toàn bộ sinh viên trong lớp
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo phiên điểm danh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
