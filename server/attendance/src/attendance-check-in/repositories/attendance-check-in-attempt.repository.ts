export interface IAttendanceCheckInAttemptRepository {
  tryRecordAttempt(
    sessionId: number,
    userId: number,
    maxAttempts: number,
    windowSeconds: number,
  ): Promise<boolean>;
}
