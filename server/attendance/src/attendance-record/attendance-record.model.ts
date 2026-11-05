import {
  AttendanceStatus,
  AttendanceValidationReason,
} from '@gps-attendance/shared';

export interface AttendanceRecord {
  sessionId: number;
  userId: number;
  status: AttendanceStatus;
  checkedInAt: Date | null; // null nếu absent
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updatedAt: Date;
  updateBy: number | null;
  reasons?: AttendanceValidationReason[];
  reviewRequested?: boolean;
  note?: string;
}

export interface MarkPresentInput {
  sessionId: number;
  userId: number;
  checkedInAt: Date;
  latitude: number;
  longitude: number;
  accuracy: number;
  updateBy: number;
  validationStatus: 'VALID' | 'REVIEW';
  reasons?: AttendanceValidationReason[];
}
