export interface IAttendanceCheckInAttemptRepository {
  incrementAttempt(sessionId: number, userId: number): Promise<number>;
  getAttemptCount(sessionId: number, userId: number): Promise<number>;
  resetAttempts(sessionId: number, userId: number): Promise<void>;
}
