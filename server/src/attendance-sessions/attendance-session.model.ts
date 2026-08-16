export type SessionStatus = 'pending' | 'open' | 'closed';

export interface AttendanceSession {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number; // đơn vị: mét
  openAt: Date;
  closeAt: Date;
  status: SessionStatus;
  createdBy: number; // user.id
  createdAt: Date;
  updatedAt: Date;
}