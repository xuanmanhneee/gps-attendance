import { useForm, useWatch } from 'react-hook-form';
import {
  MdMyLocation,
  MdLocationOn,
  MdAccessTime,
  MdGroup,
  MdOutlineTitle,
} from 'react-icons/md';
import { toast } from 'react-toastify';

import { useTranslation } from '../hooks/useTranslation';
import type { CreateSessionFormData } from '../types/attendance-session';
import { CreateSessionModalActions } from './CreateSessionModalActions';
import { CreateSessionModalHeader } from './CreateSessionModalHeader';

export type { CreateSessionFormData };

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
  const { t } = useTranslation();
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
      toast.error(t('sessions.form.locationError'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', parseFloat(position.coords.latitude.toFixed(6)));
        setValue('longitude', parseFloat(position.coords.longitude.toFixed(6)));
        toast.success(t('sessions.form.locationSuccess'));
      },
      (_error) => {
        toast.error(t('sessions.form.locationError'));
      },
      { enableHighAccuracy: true },
    );
  };

  const handleFormSubmit = async (values: CreateSessionFormValues) => {
    try {
      const openAt = `${values.openDate}T${values.openTime}`;
      const closeAt = `${values.closeDate}T${values.closeTime}`;

      if (new Date(openAt) >= new Date(closeAt)) {
        toast.error(t('sessions.form.timeRangeInvalid'));
        return;
      }

      const codes = parseStudentCodes(values.studentCodesText);
      if (codes.length === 0) {
        toast.error(t('sessions.form.participantCodesRequired'));
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
          codeFilter: { include: codes },
        },
      };

      if (onSubmitSuccess) {
        await onSubmitSuccess(data);
      }
      toast.success(t('sessions.createSuccess'));
      reset();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('sessions.createError'),
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-panel animate-in fade-in zoom-in duration-200">
        <CreateSessionModalHeader onClose={onClose} />

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
        >
          {/* Section 1: Tên phiên */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-1.5">
              <MdOutlineTitle className="text-accent-strong text-sm" />
              {t('sessions.form.title')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder={t('sessions.form.titlePlaceholder')}
              aria-invalid={Boolean(errors.title)}
              {...register('title', {
                required: t('sessions.form.titleRequired'),
              })}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2 text-base text-ink placeholder:text-muted-soft focus:border-accent-strong focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
            />
            {errors.title && (
              <p className="text-danger text-xs mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Section 2: Tọa độ GPS & Bán kính */}
          <div className="space-y-3 rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <MdLocationOn className="text-accent-strong text-sm" />
                {t('sessions.form.locationSection')} <span className="text-danger">*</span>
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="flex items-center gap-1 text-sm font-medium text-accent-strong transition-colors hover:text-accent-strong bg-accent-soft px-2.5 py-1 rounded-md border border-accent-strong cursor-pointer"
              >
                <MdMyLocation />
                {t('sessions.form.useCurrentLocation')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">
                  {t('sessions.form.latitude')}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="21.028511"
                  {...register('latitude', {
                    required: t('sessions.form.latitudeRequired'),
                    valueAsNumber: true,
                    validate: (value) => {
                      if (value === null || value === undefined || isNaN(value)) return t('sessions.form.latitudeRequired');
                      if (value < -90 || value > 90) return t('sessions.form.latitudeInvalid');
                      return true;
                    },
                  })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-muted-soft focus:border-accent-strong focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
                />
                {errors.latitude && (
                  <p className="text-danger text-xs mt-1">
                    {errors.latitude.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">
                  {t('sessions.form.longitude')}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="105.804817"
                  {...register('longitude', {
                    required: t('sessions.form.longitudeRequired'),
                    valueAsNumber: true,
                    validate: (value) => {
                      if (value === null || value === undefined || isNaN(value)) return t('sessions.form.longitudeRequired');
                      if (value < -180 || value > 180) return t('sessions.form.longitudeInvalid');
                      return true;
                    },
                  })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-muted-soft focus:border-accent-strong focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
                />
                {errors.longitude && (
                  <p className="text-danger text-xs mt-1">
                    {errors.longitude.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">
                  {t('sessions.form.radius')}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="50"
                  {...register('radius', {
                    required: t('sessions.form.radiusRequired'),
                    valueAsNumber: true,
                    validate: (value) => {
                      if (value === null || value === undefined || isNaN(value)) return t('sessions.form.radiusRequired');
                      if (value <= 0) return t('sessions.form.radiusInvalid');
                      return true;
                    },
                  })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-muted-soft focus:border-accent-strong focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
                />
                {errors.radius && (
                  <p className="text-danger text-xs mt-1">
                    {errors.radius.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Thời gian */}
          <div className="space-y-3 rounded-xl border border-line bg-surface-subtle p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <MdAccessTime className="text-accent-strong text-sm" />
              <h3 className="text-sm font-semibold text-ink">
                {t('sessions.form.timeSection')}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="mb-2 text-sm font-semibold text-ink">
                  {t('sessions.form.openTime')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm text-muted">
                    {t('sessions.form.openDate')}
                    <input
                      type="date"
                      {...register('openDate', {
                        required: t('sessions.form.openTimeRequired'),
                      })}
                      className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-base text-ink outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
                    />
                  </label>
                  <label className="text-sm text-muted">
                    {t('sessions.form.openClock')}
                    <input
                      type="time"
                      {...register('openTime', {
                        required: t('sessions.form.openTimeRequired'),
                      })}
                      className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-base text-ink outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
                    />
                  </label>
                </div>
                {errors.openDate && (
                  <p className="text-danger text-xs mt-1">
                    {errors.openDate.message}
                  </p>
                )}
                {errors.openTime && (
                  <p className="text-danger text-xs mt-1">
                    {errors.openTime.message}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="mb-2 text-sm font-semibold text-ink">
                  {t('sessions.form.closeTime')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm text-muted">
                    {t('sessions.form.closeDate')}
                    <input
                      type="date"
                      {...register('closeDate', {
                        required: t('sessions.form.closeTimeRequired'),
                      })}
                      className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-base text-ink outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
                    />
                  </label>
                  <label className="text-sm text-muted">
                    {t('sessions.form.closeClock')}
                    <input
                      type="time"
                      {...register('closeTime', {
                        required: t('sessions.form.closeTimeRequired'),
                      })}
                      className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-base text-ink outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
                    />
                  </label>
                </div>
                {errors.closeDate && (
                  <p className="text-danger text-xs mt-1">
                    {errors.closeDate.message}
                  </p>
                )}
                {errors.closeTime && (
                  <p className="text-danger text-xs mt-1">
                    {errors.closeTime.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Mã sinh viên tham gia (tạm thời: nhập tay, phân cách bằng dấu phẩy) */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-1.5">
              <MdGroup className="text-accent-strong text-sm" />
              {t('sessions.form.participantCodes')} <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              placeholder={t('sessions.form.titlePlaceholder')}
              {...register('studentCodesText', {
                required: t('sessions.form.participantCodesRequired'),
                validate: (value) =>
                  parseStudentCodes(value).length > 0 ||
                  t('sessions.form.participantCodesRequired'),
              })}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2 text-base text-ink placeholder:text-muted-soft focus:border-accent-strong focus:outline-none focus:ring-2 focus:ring-accent-soft resize-none disabled:opacity-60"
            />
            <div className="mt-1.5 flex items-center justify-between">
              {errors.studentCodesText ? (
                <p className="text-danger text-xs">
                  {errors.studentCodesText.message}
                </p>
              ) : (
                <span className="text-xs text-muted-soft">
                  {t('sessions.form.participantCodesHint')}
                </span>
              )}
              {studentCodesPreviewCount > 0 && (
                <span className="text-xs text-positive">
                  {t('sessions.form.participantCodesValid', { count: studentCodesPreviewCount })}
                </span>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <CreateSessionModalActions
              isSubmitting={isSubmitting}
              onClose={onClose}
            />
          </div>
        </form>
      </div>
    </div>
  );
};
