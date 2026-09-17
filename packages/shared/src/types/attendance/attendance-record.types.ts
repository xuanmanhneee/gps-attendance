// attendance-record.types.ts
import type { UserResponse } from '../users';

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceParticipantResponse {
  user: UserResponse;
  status: AttendanceStatus;
  checkedInAt: string | null;
  updatedAt: string;
}
