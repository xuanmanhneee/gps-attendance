import type { SessionStatus } from '@gps-attendance/shared';

import type { TranslationKey } from '../i18n/translation-keys';

/** Thứ tự hiển thị trạng thái phiên điểm danh trong dashboard. */
export const SESSION_STATUS_ORDER: readonly SessionStatus[] = [
  'open',
  'pending',
  'closed',
];

export const SESSION_STATUS_LABEL_KEYS: Record<SessionStatus, TranslationKey> = {
  open: 'sessions.status.open',
  pending: 'sessions.status.pending',
  closed: 'sessions.status.closed',
  cancelled: 'sessions.status.cancelled',
};

/**
 * Chấm màu trạng thái trong bảng phiên.
 *
 * Chỉ là lớp nhấn thêm: nhãn chữ của `StatusBadge` vẫn là nguồn thông tin chính
 * nên trạng thái không bị phân biệt chỉ bằng màu.
 */
export const SESSION_STATUS_DOT_CLASS: Record<SessionStatus, string> = {
  open: 'bg-positive',
  pending: 'bg-warning',
  closed: 'bg-muted-soft',
  cancelled: 'bg-danger',
};
