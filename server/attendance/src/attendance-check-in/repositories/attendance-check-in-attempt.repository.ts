import type { AttendanceAttemptResult } from '@prisma/client';

export interface AttendanceAttemptInput {
  sessionId: number;
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceToCenter: number;
  deviceId: string;
  isMockLocation: boolean;
}

export interface IAttendanceCheckInAttemptRepository {
  createAttempt(input: AttendanceAttemptInput): Promise<{ id: number; count: number }>;
  completeAttempt(
    id: number,
    result: AttendanceAttemptResult,
    reasons: string[],
  ): Promise<void>;
  getAttemptCount(sessionId: number, userId: number): Promise<number>;
}
