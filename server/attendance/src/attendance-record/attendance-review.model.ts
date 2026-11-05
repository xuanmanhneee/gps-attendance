import { AttendanceValidationReason } from '@gps-attendance/shared';

export interface AttendanceReviewCandidate {
  sessionId: number;
  userId: number;
  reasons: AttendanceValidationReason[];
  createdAt: Date;
}
