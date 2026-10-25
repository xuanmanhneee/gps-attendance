import { Injectable } from '@nestjs/common';

import { IAttendanceCheckInAttemptRepository } from '../../repositories/attendance-check-in-attempt.repository';
import { IAttendanceCheckInDeviceUsageRepository } from '../../repositories/attendance-check-in-device-usage.repository';

@Injectable()
export class InMemoryAttendanceCheckInStore
  implements
    IAttendanceCheckInAttemptRepository,
    IAttendanceCheckInDeviceUsageRepository
{
  private readonly attemptTimestamps = new Map<string, number[]>();

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

  // --- IAttendanceCheckInDeviceUsageRepository ---

  async isUsed(sessionId: number, deviceId: string): Promise<boolean> {
    return this.deviceUsageBySession.get(sessionId)?.has(deviceId) ?? false;
  }

  async markUsed(sessionId: number, deviceId: string): Promise<boolean> {
    let deviceSet = this.deviceUsageBySession.get(sessionId);

    if (!deviceSet) {
      deviceSet = new Set();
      this.deviceUsageBySession.set(sessionId, deviceSet);
    }

    if (deviceSet.has(deviceId)) {
      return false; // đã dùng trước đó rồi
    }

    deviceSet.add(deviceId);
    return true; // lần đầu dùng
  }
}
