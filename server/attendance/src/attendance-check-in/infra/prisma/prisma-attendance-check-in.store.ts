import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/database/prisma.service';
import type { AttendanceAttemptResult } from '@prisma/client';
import type { AttendanceAttemptInput } from '../../repositories/attendance-check-in-attempt.repository';
import { IAttendanceCheckInAttemptRepository } from '../../repositories/attendance-check-in-attempt.repository';
import { IAttendanceCheckInDeviceUsageRepository } from '../../repositories/attendance-check-in-device-usage.repository';

@Injectable()
export class PrismaAttendanceCheckInStore
  implements
    IAttendanceCheckInAttemptRepository,
    IAttendanceCheckInDeviceUsageRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async createAttempt(
    input: AttendanceAttemptInput,
  ): Promise<{ id: number; count: number }> {
    const attempt = await this.prisma.attendanceAttempt.create({
      data: {
        sessionId: input.sessionId,
        userId: input.userId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        distanceToCenter: input.distanceToCenter,
        deviceId: input.deviceId,
        isMockLocation: input.isMockLocation,
      },
    });

    return {
      id: attempt.id,
      count: await this.getAttemptCount(input.sessionId, input.userId),
    };
  }

  async completeAttempt(
    id: number,
    result: AttendanceAttemptResult,
    reasons: string[],
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const attempt = await transaction.attendanceAttempt.update({
        where: { id },
        data: { result, reasons },
        select: { id: true, sessionId: true, userId: true },
      });

      await transaction.attendanceHistoryEvent.create({
        data: {
          sessionId: attempt.sessionId,
          userId: attempt.userId,
          actorId: attempt.userId,
          attemptId: attempt.id,
          eventType: 'CHECK_IN_ATTEMPT',
          status: result === 'APPROVED' || result === 'REVIEW' ? 'present' : null,
          attemptResult: result,
          reasons,
        },
      });
    });
  }

  async getAttemptCount(sessionId: number, userId: number): Promise<number> {
    return this.prisma.attendanceAttempt.count({
      where: { sessionId, userId },
    });
  }

  async resetAttempts(sessionId: number, userId: number): Promise<void> {
    await this.prisma.attendanceAttempt.deleteMany({
      where: { sessionId, userId },
    });
  }

  async isUsed(sessionId: number, deviceId: string, userId?: number): Promise<boolean> {
    // 1. Kiểm tra xem deviceId đã được sử dụng thành công bởi sinh viên khác trong session này chưa
    const record = await this.prisma.attendanceRecord.findFirst({
      where: {
        sessionId,
        deviceId,
        status: 'present',
        ...(userId ? { userId: { not: userId } } : {}),
      },
      select: { id: true },
    });

    if (record !== null) {
      return true;
    }

    // 2. Kiểm tra xem deviceId đã từng được gửi trong các lượt attempt bởi sinh viên khác trong session này chưa
    const attempt = await this.prisma.attendanceAttempt.findFirst({
      where: {
        sessionId,
        deviceId,
        ...(userId ? { userId: { not: userId } } : {}),
      },
      select: { id: true },
    });

    return attempt !== null;
  }

  async markUsed(_sessionId: number, _deviceId: string): Promise<void> {
    // A successful check-in persists deviceId on AttendanceRecord.
  }
}