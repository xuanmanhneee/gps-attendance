// attendance-session.types.ts
import type { UserFilterCriteria } from '../users';
import type {
  AttendanceParticipantResponse,
  AttendanceStatus,
} from './attendance-record.types';

export type SessionStatus = 'pending' | 'open' | 'closed' | 'cancelled';

export interface AttendanceSessionResponse {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number; // mét
  openAt: string;
  closeAt: string;
  status: SessionStatus;
}

export interface AttendanceSessionDetailResponse extends AttendanceSessionResponse {
  participants: AttendanceParticipantResponse[];
}

export interface MyAttendanceSessionResponse extends AttendanceSessionResponse {
  myAttendance: {
    status: AttendanceStatus;
    checkedInAt: string | null; // null nếu absent
  };
}

export interface CreateAttendanceSessionRequest {
  title: string;

  latitude: number;
  longitude: number;
  radius: number;

  openAt: string;
  closeAt: string;

  participantCriteria: UserFilterCriteria;
}

/**
 * Body của PATCH /v0/attendance-sessions/:id.
 *
 * Mọi field đều optional, chỉ gửi field cần đổi. Backend còn chặn theo trạng thái:
 * - phiên `open`: chỉ được gửi `closeAt`
 * - roster đã khởi tạo (trước giờ mở 5 phút): không được gửi `participantCriteria`
 */
export interface UpdateAttendanceSessionRequest {
  title?: string;

  latitude?: number;
  longitude?: number;
  radius?: number;

  openAt?: string;
  closeAt?: string;

  participantCriteria?: UserFilterCriteria;
}
