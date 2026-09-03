export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
  sessionId: number;
  userId: number;
  status: AttendanceStatus;
  checkedInAt: Date | null; // null nếu absent
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updatedAt: Date;
}

export interface MarkPresentInput {
  sessionId: number;
  userId: number;
  checkedInAt: Date;
  latitude: number;
  longitude: number;
  accuracy: number;
}
