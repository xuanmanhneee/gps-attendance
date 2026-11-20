import type { AttendanceReviewCandidate } from './attendance-review.model';

export interface IAttendanceReviewRepository {
  upsert(candidate: AttendanceReviewCandidate, expiresAt: Date): Promise<void>;
  find(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceReviewCandidate | null>;
  findBySession(sessionId: number): Promise<AttendanceReviewCandidate[]>;
  updateSessionExpiry(sessionId: number, expiresAt: Date): Promise<void>;
  delete(sessionId: number, userId: number): Promise<void>;
  clearSession(sessionId: number): Promise<void>;
}
