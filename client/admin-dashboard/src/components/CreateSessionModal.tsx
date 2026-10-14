import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { IoClose } from 'react-icons/io5';
import {
  MdAccessTime,
  MdOutlineTitle,
  MdSchool,
} from 'react-icons/md';
import { toast } from 'react-toastify';
import type { CreateAttendanceSessionRequest } from '@gps-attendance/shared';
import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import type {
  LecturerGpsEvidence,
  SectionRoster,
  TeachingSectionOption,
} from '../api/attendance-sessions.api';

export type CreateSessionFormData = CreateAttendanceSessionRequest;

interface CreateSessionFormValues {
  title: string;
  courseSectionId: number;
  timetableSlotId: number;
  openDate: string;
  openTime: string;
  closeDate: string;
  closeTime: string;
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (
    data: CreateSessionFormData,
    lecturerGps?: LecturerGpsEvidence,
  ) => Promise<void> | void;
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

const shiftDate = (dateValue: string, days: number): string => {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateTimeLocal(date).split('T')[0];
};

const getDateWeekday = (dateValue: string): number => {
  const day = new Date(`${dateValue}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
};

const getWeekdayLabel = (dayOfWeek: number): string =>
  dayOfWeek === 7 ? 'Chủ nhật' : `Thứ ${dayOfWeek + 1}`;

export const CreateSessionModal = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}: CreateSessionModalProps) => {
  const [sections, setSections] = useState<TeachingSectionOption[]>([]);
  const [sectionRoster, setSectionRoster] = useState<SectionRoster | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
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
      courseSectionId: 0,
      timetableSlotId: 0,
      openDate: formatDateTimeLocal(now).split('T')[0],
      openTime: formatDateTimeLocal(now).split('T')[1],
      closeDate: formatDateTimeLocal(twoHoursLater).split('T')[0],
      closeTime: formatDateTimeLocal(twoHoursLater).split('T')[1],
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoadingSections(true);
    attendanceSessionsApi
      .getTeachingSections()
      .then((data) => {
        if (active) setSections(data);
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : 'Không tải được danh sách lớp học phần');
      })
      .finally(() => {
        if (active) setIsLoadingSections(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  const courseSectionId = useWatch({
    control,
    name: 'courseSectionId',
  });
  const timetableSlotId = useWatch({ control, name: 'timetableSlotId' });
  const openDate = useWatch({ control, name: 'openDate' });
  const closeDate = useWatch({ control, name: 'closeDate' });
  const selectedSection = sections.find((section) => section.id === courseSectionId);
  const selectedSlot = selectedSection?.timetable.find(
    (slot) => slot.id === timetableSlotId,
  );
  const selectedRoom = selectedSlot?.room ?? selectedSection?.room;
  const selectedBuilding = selectedRoom?.building;
  const needsTimetableSlot = !!selectedSection;
  const isSelectedLocationReady =
    selectedRoom?.status === 'ACTIVE' &&
    selectedBuilding?.type === 'BUILDING' &&
    selectedBuilding.status === 'ACTIVE' &&
    selectedBuilding.verified &&
    selectedBuilding.geofenceRadius !== null &&
    selectedBuilding.gpsAccuracyThreshold !== null;

  useEffect(() => {
    if (!isOpen || !courseSectionId || courseSectionId <= 0) {
      setSectionRoster(null);
      setRosterError(null);
      setIsLoadingRoster(false);
      return;
    }

    let active = true;
    setSectionRoster(null);
    setRosterError(null);
    setIsLoadingRoster(true);
    attendanceSessionsApi
      .getSectionRoster(courseSectionId)
      .then((data) => {
        if (active) setSectionRoster(data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRosterError(error instanceof Error ? error.message : 'Không tải được danh sách sinh viên.');
      })
      .finally(() => {
        if (active) setIsLoadingRoster(false);
      });

    return () => {
      active = false;
    };
  }, [courseSectionId, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (values: CreateSessionFormValues) => {
    try {
      const openDateObj = new Date(`${values.openDate}T${values.openTime}`);
      const closeDateObj = new Date(`${values.closeDate}T${values.closeTime}`);

      if (closeDateObj <= openDateObj) {
        toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
        return;
      }
      if (!selectedSection || values.courseSectionId <= 0) {
        toast.error('Vui lòng chọn lớp học phần');
        return;
      }
      if (selectedSection.activeEnrollmentCount === 0) {
        toast.error('Lớp chưa có sinh viên ghi danh active; hãy nhờ quản trị viên nhập roster.');
        return;
      }
      if (selectedSection.timetable.length === 0) {
        toast.error('Lớp chưa có thời khóa biểu; hãy nhờ quản trị viên khai báo ca học.');
        return;
      }
      if (values.timetableSlotId <= 0) {
        toast.error('Vui lòng chọn ca học trong thời khóa biểu');
        return;
      }
      if (!isSelectedLocationReady) {
        toast.error('Phòng học chưa liên kết với Building đã hiệu chuẩn GPS');
        return;
      }

      const data: CreateSessionFormData = {
        title: values.title,
        openAt: openDateObj.toISOString(),
        closeAt: closeDateObj.toISOString(),
        courseSectionId: selectedSection.id,
        ...(values.timetableSlotId > 0
          ? { timetableSlotId: values.timetableSlotId }
          : {}),
      };

      const lecturerGps = await new Promise<LecturerGpsEvidence | undefined>(
        (resolve) => {
          if (!navigator.geolocation) {
            resolve(undefined);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date(position.timestamp).toISOString(),
              }),
            () => resolve(undefined),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
          );
        },
      );
      if (!lecturerGps) {
        toast.info('Không lấy được GPS giảng viên; session vẫn dùng tọa độ cố định của Building.');
      }
      if (onSubmitSuccess) {
        await onSubmitSuccess(data, lecturerGps);
      }
      toast.success('Tạo phiên điểm danh thành công!');
      reset();
      onClose();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo phiên');
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

          {/* Section 2: Lớp học phần → lịch → phòng → tòa */}
          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <MdSchool className="text-blue-600 text-sm" />
              Lớp học phần <span className="text-red-500">*</span>
            </label>
            <select
              {...register('courseSectionId', {
                required: 'Vui lòng chọn lớp học phần',
                min: { value: 1, message: 'Vui lòng chọn lớp học phần' },
                valueAsNumber: true,
              })}
              onChange={(event) => {
                setValue('courseSectionId', Number(event.target.value));
                setValue('timetableSlotId', 0);
              }}
              disabled={isLoadingSections || sections.length === 0}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value={0}>
                {isLoadingSections ? 'Đang tải lớp học phần…' : 'Chọn lớp học phần'}
              </option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.course.code} — {section.course.name} ({section.code}) · {section.term.name}
                </option>
              ))}
            </select>
            {errors.courseSectionId && (
              <p className="text-xs text-red-600">{errors.courseSectionId.message}</p>
            )}
            {!isLoadingSections && sections.length === 0 && (
              <p className="text-xs text-amber-800">
                Chưa có lớp học phần được phân công. Quản trị viên cần tạo lớp, phân công giảng viên, nhập danh sách sinh viên và khai báo thời khóa biểu trước khi tạo phiên.
                {' '}
                <Link to="/course-sections" className="font-semibold underline underline-offset-2">
                  Mở trang quản lý lớp học phần
                </Link>
              </p>
            )}

            {selectedSection && selectedSection.timetable.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Ca học trong thời khóa biểu <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('timetableSlotId', {
                    valueAsNumber: true,
                    validate: (value) =>
                      !needsTimetableSlot || value > 0 || 'Vui lòng chọn ca học',
                  })}
                  onChange={(event) => {
                    const slotId = Number(event.target.value);
                    setValue('timetableSlotId', slotId);
                    const slot = selectedSection.timetable.find((item) => item.id === slotId);
                    if (!slot || !openDate || !closeDate) return;

                    if (slot.scheduledDate) {
                      setValue('openDate', slot.scheduledDate);
                      setValue('closeDate', slot.scheduledDate);
                      return;
                    }
                    const weekdayOffset =
                      (slot.dayOfWeek - getDateWeekday(openDate) + 7) % 7;
                    if (weekdayOffset > 0) {
                      setValue('openDate', shiftDate(openDate, weekdayOffset));
                      setValue('closeDate', shiftDate(closeDate, weekdayOffset));
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value={0}>Chọn ca học</option>
                  {selectedSection.timetable.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.scheduledDate
                        ? `${slot.scheduledDate} · `
                        : `${getWeekdayLabel(slot.dayOfWeek)} hằng tuần · `}
                      {Math.floor(slot.startMinute / 60).toString().padStart(2, '0')}:{(slot.startMinute % 60).toString().padStart(2, '0')}–{Math.floor(slot.endMinute / 60).toString().padStart(2, '0')}:{(slot.endMinute % 60).toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                {errors.timetableSlotId && (
                  <p className="text-xs text-red-600">{errors.timetableSlotId.message}</p>
                )}
                {selectedSlot && selectedSlot.scheduledDate && openDate !== selectedSlot.scheduledDate && (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    Ngày bắt đầu cần là {selectedSlot.scheduledDate} theo buổi học đã chọn.
                  </p>
                )}
                {selectedSlot && !selectedSlot.scheduledDate && openDate && getDateWeekday(openDate) !== selectedSlot.dayOfWeek && (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    Ngày bắt đầu cần rơi vào {getWeekdayLabel(selectedSlot.dayOfWeek)} theo ca đã chọn.
                  </p>
                )}
              </div>
            )}

            {selectedSection && (
              <div className="rounded-lg border border-white bg-white p-3 text-sm">
                <p className="font-semibold text-gray-800">
                  {selectedRoom ? `${selectedRoom.code} — ${selectedRoom.name}` : 'Chưa gán phòng học'}
                  {selectedRoom?.floor ? ` · Tầng ${selectedRoom.floor}` : ''}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {selectedSection.activeEnrollmentCount} sinh viên đang active
                </p>
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <p className="mb-1 text-xs font-semibold text-gray-700">Danh sách sinh viên sẽ được thêm vào phiên</p>
                  {isLoadingRoster ? (
                    <p className="text-xs text-gray-500">Đang tải roster…</p>
                  ) : rosterError ? (
                    <p role="alert" className="text-xs text-red-700">{rosterError}</p>
                  ) : sectionRoster?.students.length ? (
                    <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                      {sectionRoster.students.map((student) => (
                        <div key={student.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate text-gray-700">{student.fullname}</span>
                          <span className="shrink-0 font-mono text-gray-500">{student.code}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700">Lớp chưa có sinh viên active; cần ghi danh roster trước khi tạo phiên.</p>
                  )}
                  <p className="mt-2 text-[11px] text-gray-500">Backend sẽ chụp lại toàn bộ enrollment active tại thời điểm tạo phiên.</p>
                </div>
                {selectedBuilding ? (
                  <p className="mt-1 text-xs text-gray-600">
                    {selectedBuilding.code} — {selectedBuilding.name} · {selectedBuilding.type}
                    {' · '}{selectedBuilding.verified ? 'Đã xác minh' : 'Chưa xác minh'}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-800">Phòng chưa liên kết với Building trong Location Registry.</p>
                )}
                {selectedBuilding?.verified && (
                  <p className="mt-1 font-mono text-[11px] text-gray-500">
                    Tâm cố định: {selectedBuilding.latitude}, {selectedBuilding.longitude}
                  </p>
                )}
                {selectedSection.activeEnrollmentCount === 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    Chưa có sinh viên active; cần ghi danh roster trước khi tạo phiên.
                  </p>
                )}
                {selectedSection.timetable.length === 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    Chưa có thời khóa biểu; quản trị viên cần khai báo ca học trên trang quản lý lớp học phần.
                  </p>
                )}
                {!isSelectedLocationReady && (
                  <div className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-800">
                    <p className="font-medium">
                      Chưa thể tạo phiên: phòng và Building phải ACTIVE; Building phải là BUILDING, đã xác minh tọa độ và có Radius/Accuracy sau field test.
                    </p>
                    <Link to="/locations" className="mt-1 inline-block font-semibold underline underline-offset-2">
                      Mở Location Registry để kiểm tra cấu hình
                    </Link>
                  </div>
                )}
              </div>
            )}
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

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Sinh viên tham gia được lấy từ enrollment active của lớp. GPS giảng viên chỉ là bằng chứng phụ; tâm và bán kính session được snapshot từ Building.
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
              disabled={
                isSubmitting ||
                isLoadingSections ||
                isLoadingRoster ||
                !!rosterError ||
                !selectedSection ||
                !isSelectedLocationReady ||
                selectedSection.activeEnrollmentCount === 0 ||
                selectedSection.timetable.length === 0 ||
                timetableSlotId <= 0
              }
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
