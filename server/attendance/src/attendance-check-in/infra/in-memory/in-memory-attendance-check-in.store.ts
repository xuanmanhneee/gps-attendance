import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { IAttendanceCheckInAttemptRepository } from '../../repositories/attendance-check-in-attempt.repository';
import { IAttendanceCheckInDeviceUsageRepository } from '../../repositories/attendance-check-in-device-usage.repository';

@Injectable()
export class InMemoryAttendanceCheckInStore
  implements
    IAttendanceCheckInAttemptRepository,
    IAttendanceCheckInDeviceUsageRepository
{
  private readonly attemptTimestamps = new Map<string, number[]>();
  private readonly attempts = new Map<
    string,
    { sessionId: number; userId: number; result?: string; reasons?: string[] }
  >();

  private readonly deviceUsageBySession = new Map<number, Set<string>>();

  // --- IAttendanceCheckInAttemptRepository ---

  async tryRecordAttempt(
    sessionId: number,
    userId: number,
    maxAttempts: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const key = `${sessionId}:${userId}`;
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;
    const recentAttempts = (this.attemptTimestamps.get(key) ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );

    if (recentAttempts.length >= maxAttempts) {
      this.attemptTimestamps.set(key, recentAttempts);
      return false;
    }

    recentAttempts.push(now);
    this.attemptTimestamps.set(key, recentAttempts);
    return true;
  }

  async createAttempt(input: {
    sessionId: number;
    userId: number;
  }): Promise<{ id: string; count: number }> {
    const id = randomUUID();
    const count =
      (await this.getAttemptCount(input.sessionId, input.userId)) + 1;
    this.attempts.set(id, { ...input });
    return { id, count };
  }

  async completeAttempt(
    id: string,
    result: string,
    reasons: string[],
  ): Promise<void> {
    const attempt = this.attempts.get(id);
    if (attempt) {
      attempt.result = result;
      attempt.reasons = reasons;
    }
  }

  async getAttemptCount(sessionId: number, userId: number): Promise<number> {
    return [...this.attempts.values()].filter(
      (attempt) =>
        attempt.sessionId === sessionId && attempt.userId === userId,
    ).length;
  }

  async setAttestationResult(): Promise<void> {}

  async getDeviceTrustStatus(
    _userId: number,
    _deviceId: string,
    loadFromDatabase: () => Promise<string>,
  ): Promise<string> {
    return loadFromDatabase();
  }

  // --- IAttendanceCheckInDeviceUsageRepository ---

  async isUsed(sessionId: number, deviceId: string): Promise<boolean> {
    return this.deviceUsageBySession.get(sessionId)?.has(deviceId) ?? false;
  }

  async markUsed(sessionId: number, deviceId: string): Promise<void> {
    let deviceSet = this.deviceUsageBySession.get(sessionId);

    if (!deviceSet) {
      deviceSet = new Set();
      this.deviceUsageBySession.set(sessionId, deviceSet);
    }

    if (deviceSet.has(deviceId)) {
      return;
    }

    deviceSet.add(deviceId);
  }
}
