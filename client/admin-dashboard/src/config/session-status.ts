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
};
