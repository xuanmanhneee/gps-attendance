import { Injectable } from '@nestjs/common';

import { IAttendanceCheckInAttemptRepository } from '../../repositories/attendance-check-in-attempt.repository';
import { IAttendanceCheckInDeviceUsageRepository } from '../../repositories/attendance-check-in-device-usage.repository';

@Injectable()
export class InMemoryAttendanceCheckInStore
  implements
    IAttendanceCheckInAttemptRepository,
    IAttendanceCheckInDeviceUsageRepository
{
  private readonly attemptsBySession = new Map<number, Map<number, number>>();

  private readonly deviceUsageBySession = new Map<number, Set<string>>();

  // --- IAttendanceCheckInAttemptRepository ---

  async incrementAttempt(sessionId: number, userId: number): Promise<number> {
    let sessionMap = this.attemptsBySession.get(sessionId);

    if (!sessionMap) {
      sessionMap = new Map();
      this.attemptsBySession.set(sessionId, sessionMap);
    }

    const next = (sessionMap.get(userId) ?? 0) + 1;

    sessionMap.set(userId, next);

    return next;
  }

  async getAttemptCount(sessionId: number, userId: number): Promise<number> {
    return this.attemptsBySession.get(sessionId)?.get(userId) ?? 0;
  }

  async resetAttempts(sessionId: number, userId: number): Promise<void> {
    this.attemptsBySession.get(sessionId)?.delete(userId);
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

    deviceSet.add(deviceId);
  }
}
