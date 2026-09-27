import { Injectable } from '@nestjs/common';
import { StudentAttendanceHistoryItemDto } from '@gps-attendance/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { AttendanceRecord } from '../attendance-record.model';
import { IAttendanceRecordRepository } from '../attendance-record.repository';

@Injectable()
export class PrismaAttendanceRecordRepository
  implements IAttendanceRecordRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    return record ? this.toModel(record) : null;
  }

  async upsertRecord(
    record: Omit<AttendanceRecord, 'updatedAt'>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.attendanceRecord.upsert({
        where: {
          sessionId_userId: {
            sessionId: record.sessionId,
            userId: record.userId,
          },
        },
        update: {
          status: record.status,
          deviceId: record.deviceId,
          checkedInAt: record.checkedInAt,
          latitude: record.latitude !== null ? record.latitude : null,
          longitude: record.longitude !== null ? record.longitude : null,
          accuracy: record.accuracy !== null ? record.accuracy : null,
          distanceMeters:
            record.distanceMeters !== null ? record.distanceMeters : null,
          updatedBy: record.updateBy,
        },
        create: {
          sessionId: record.sessionId,
          userId: record.userId,
          status: record.status,
          deviceId: record.deviceId,
          checkedInAt: record.checkedInAt,
          latitude: record.latitude !== null ? record.latitude : null,
          longitude: record.longitude !== null ? record.longitude : null,
          accuracy: record.accuracy !== null ? record.accuracy : null,
          distanceMeters:
            record.distanceMeters !== null ? record.distanceMeters : null,
          updatedBy: record.updateBy,
        },
      }),
    ]);
  }

  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((record) => this.toModel(record));
  }

  async findDetailedHistoryByUser(
    userId: number,
  ): Promise<StudentAttendanceHistoryItemDto[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { userId },
      include: {
        session: true,
      },
      orderBy: {
        session: {
          openAt: 'desc',
        },
      },
    });

    const now = new Date();

    return records.map((record) => {
      let sessionStatus: 'open' | 'pending' | 'closed' = 'pending';
      if (now < record.session.openAt) {
        sessionStatus = 'pending';
      } else if (now > record.session.closeAt) {
        sessionStatus = 'closed';
      } else {
        sessionStatus = 'open';
      }

      return {
        id: record.id,
        sessionId: record.sessionId,
        sessionTitle: record.session.title,
        sessionStatus,
        openAt: record.session.openAt.toISOString(),
        closeAt: record.session.closeAt.toISOString(),
        radius: this.toNumber(record.session.radius) ?? 0,
        sessionLatitude: this.toNumber(record.session.latitude) ?? 0,
        sessionLongitude: this.toNumber(record.session.longitude) ?? 0,
        status: record.status as StudentAttendanceHistoryItemDto['status'],
        checkedInAt: record.checkedInAt
          ? record.checkedInAt.toISOString()
          : null,
        deviceId: record.deviceId,
        latitude: this.toNumber(record.latitude),
        longitude: this.toNumber(record.longitude),
        accuracy: this.toNumber(record.accuracy),
        distanceMeters: this.toNumber(record.distanceMeters),
      };
    });
  }

  async findBySession(sessionId: number): Promise<AttendanceRecord[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((record) => this.toModel(record));
  }

  private toModel(record: {
    sessionId: number;
    userId: number;
    status: string;
    deviceId: string | null;
    checkedInAt: Date | null;
    latitude: number | null | { toNumber: () => number };
    longitude: number | null | { toNumber: () => number };
    accuracy: number | null | { toNumber: () => number };
    distanceMeters: number | null | { toNumber: () => number };
    updatedAt: Date;
    updatedBy: number | null;
  }): AttendanceRecord {
    return {
      sessionId: record.sessionId,
      userId: record.userId,
      status: record.status as AttendanceRecord['status'],
      deviceId: record.deviceId,
      checkedInAt: record.checkedInAt,
      latitude: this.toNumber(record.latitude),
      longitude: this.toNumber(record.longitude),
      accuracy: this.toNumber(record.accuracy),
      distanceMeters: this.toNumber(record.distanceMeters),
      updatedAt: record.updatedAt,
      updateBy: record.updatedBy,
    };
  }

  private toNumber(
    value: number | null | { toNumber: () => number },
  ): number | null {
    if (value === null) return null;
    return typeof value === 'number' ? value : value.toNumber();
  }
}
