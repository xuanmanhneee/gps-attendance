// attendance-record.types.ts
import type { UserResponse } from '../users';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceParticipantResponse {
  user: UserResponse;
  status: AttendanceStatus;
  checkedInAt: string | null;
  updatedAt: string;
}
