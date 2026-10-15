import type { AttendanceStatus, Role } from '@gps-attendance/shared';

import type { TranslationKey } from '../i18n/translation-keys';

/**
 * Cấu hình hiển thị trạng thái điểm danh của participant trong chi tiết phiên.
 *
 * Component chỉ đọc từ đây, không tự đặt màu rời rạc; trạng thái luôn có nhãn
 * chữ (không chỉ dùng màu) nên vẫn phân biệt được khi không nhận diện màu.
 */
export const ATTENDANCE_STATUS_LABEL_KEYS: Record<
  AttendanceStatus,
  TranslationKey
> = {
  present: 'sessionDetail.present',
  absent: 'sessionDetail.absent',
  late: 'sessionDetail.late',
  excused: 'sessionDetail.excused',
};

export const ATTENDANCE_STATUS_TONE_CLASS: Record<AttendanceStatus, string> = {
  present: 'bg-positive-soft text-positive',
  absent: 'bg-surface-subtle text-muted',
  late: 'bg-warning-soft text-warning',
  excused: 'bg-accent-soft text-accent-strong',
};

/** Nhãn vai trò của participant, dùng chung key `roles.*` với profile. */
export const PARTICIPANT_ROLE_LABEL_KEYS: Record<Role, TranslationKey> = {
  admin: 'roles.admin',
  lecturer: 'roles.lecturer',
  student: 'roles.student',
};
