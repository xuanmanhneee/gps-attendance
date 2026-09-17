import { useForm, useWatch } from 'react-hook-form';
import { IoClose } from 'react-icons/io5';
import {
  MdMyLocation,
  MdLocationOn,
  MdAccessTime,
  MdGroup,
  MdOutlineTitle,
} from 'react-icons/md';
import { toast } from 'react-toastify';
import type { CreateSessionFormData } from '../types/attendance-session';
import { CreateSessionModalActions } from './CreateSessionModalActions';
import { CreateSessionModalHeader } from './CreateSessionModalHeader';

interface CreateSessionFormValues {
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  openDate: string;
  openTime: string;
  closeDate: string;
  closeTime: string;
  // Vùng nhập tạm thời: text thô, phân cách bởi dấu phẩy.
  // TODO: thay bằng UI chọn unit/tag khi có sẵn.
  studentCodesText: string;
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

// Parse chuỗi mã sinh viên phân cách bằng dấu phẩy -> mảng code đã trim, loại rỗng, dedup
const parseStudentCodes = (raw: string): string[] => {
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const code = part.trim();
    if (code) seen.add(code);
  }
  return Array.from(seen);
};

export const CreateSessionModal = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}: CreateSessionModalProps) => {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionFormValues>({
    defaultValues: {
      title: '',
      radius: 50,
      openDate: formatDateTimeLocal(now).split('T')[0],
      openTime: formatDateTimeLocal(now).split('T')[1],
      closeDate: formatDateTimeLocal(twoHoursLater).split('T')[0],
      closeTime: formatDateTimeLocal(twoHoursLater).split('T')[1],
      studentCodesText: '',
    },
  });

  const studentCodesText = useWatch({
    control,
    name: 'studentCodesText',
  });

  if (!isOpen) return null;

  const studentCodesPreviewCount = parseStudentCodes(studentCodesText).length;

  // Lấy tọa độ GPS hiện tại từ trình duyệt
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', parseFloat(position.coords.latitude.toFixed(6)));
        setValue('longitude', parseFloat(position.coords.longitude.toFixed(6)));
        toast.success('Đã lấy tọa độ hiện tại thành công!');
      },
      (error) => {
        toast.error('Không thể lấy vị trí: ' + error.message);
      },
      { enableHighAccuracy: true },
    );
  };

  const handleFormSubmit = async (values: CreateSessionFormValues) => {
    try {
      const openAt = `${values.openDate}T${values.openTime}`;
      const closeAt = `${values.closeDate}T${values.closeTime}`;

      if (new Date(openAt) >= new Date(closeAt)) {
        toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
        return;
      }

      const codes = parseStudentCodes(values.studentCodesText);
      if (codes.length === 0) {
        toast.error('Vui lòng nhập ít nhất một mã sinh viên');
        return;
      }

      const data: CreateSessionFormData = {
        title: values.title,
        latitude: values.latitude,
        longitude: values.longitude,
        radius: values.radius,
        openAt,
        closeAt,
        participantCriteria: {
          codeFilter: { addCodes: codes },
        },
      };

      if (onSubmitSuccess) {
        await onSubmitSuccess(data);
      }
      toast.success('Tạo phiên điểm danh thành công!');
      reset();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo phiên';
      toast.error(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        <CreateSessionModalHeader onClose={onClose} />

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
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 cursor-pointer"
              >
                <MdMyLocation />
                Lấy vị trí hiện tại
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

          {/* Section 4: Mã sinh viên tham gia (tạm thời: nhập tay, phân cách bằng dấu phẩy) */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <MdGroup className="text-blue-600 text-sm" />
              Mã sinh viên được tham gia <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="VD: SV001, SV002, SV003"
              {...register('studentCodesText', {
                required: 'Vui lòng nhập ít nhất một mã sinh viên',
                validate: (value) =>
                  parseStudentCodes(value).length > 0 ||
                  'Vui lòng nhập ít nhất một mã sinh viên',
              })}
              className="w-full px-3.5 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
            />
            <div className="mt-1.5 flex items-center justify-between">
              {errors.studentCodesText ? (
                <p className="text-red-500 text-xs">
                  {errors.studentCodesText.message}
                </p>
              ) : (
                <span className="text-xs text-gray-400">
                  Phân cách các mã bằng dấu phẩy
                </span>
              )}
              {studentCodesPreviewCount > 0 && (
                <span className="text-xs text-green-600">
                  {studentCodesPreviewCount} mã hợp lệ
                </span>
              )}
            </div>
          </div>

          <CreateSessionModalActions
            isSubmitting={isSubmitting}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
};
