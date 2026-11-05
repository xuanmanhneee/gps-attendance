export const AuditEntityType = {
  ATTENDANCE_RECORD: 'AttendanceRecord',
} as const;

export const AuditAction = {
  REVIEW_RESOLVED: 'REVIEW_RESOLVED',
} as const;

export type AuditEntityType =
  (typeof AuditEntityType)[keyof typeof AuditEntityType];
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
