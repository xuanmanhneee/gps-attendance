export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
  sessionId: number;
  userId: number;
  status: AttendanceStatus;
  deviceId: string | null; // null nếu absent, không có gì để lưu
  checkedInAt: Date | null; // null nếu absent
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  distanceMeters: number | null;
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
