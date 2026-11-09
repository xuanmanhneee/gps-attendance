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
  platform?: string;
  model?: string | null;
}

export interface IAttendanceCheckInAttemptRepository {
  createAttempt(input: AttendanceAttemptInput): Promise<{ id: string; count: number }>;
  completeAttempt(
    id: string,
    result: AttendanceAttemptResult,
    reasons: string[],
  ): Promise<void>;
  getAttemptCount(sessionId: number, userId: number): Promise<number>;
  setAttestationResult(
    id: string,
    input: {
      provider: 'PLAY_INTEGRITY' | 'APP_ATTEST';
      verdict: string;
      reasons: string[];
    },
  ): Promise<void>;
  getDeviceTrustStatus(
    userId: number,
    deviceId: string,
    loadFromDatabase: () => Promise<string>,
  ): Promise<string>;
}
