// store/prisma-attendance-record.repository.ts
import { Injectable } from '@nestjs/common';
import { AttendanceRecord as PrismaAttendanceRecord } from '#prisma/generated/client';

import { AttendanceRecord } from '../../attendance-record.model';
import { IAttendanceRecordRepository } from '../../attendance-record.repository';
import { PrismaService } from '#prisma/prisma.service'; // sửa lại path đúng theo vị trí thật trong project

@Injectable()
export class PrismaAttendanceRecordRepository implements IAttendanceRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getRecord(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceRecord | null> {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });

    return record ? this.toModel(record) : null;
  }

  async findByUser(userId: number): Promise<AttendanceRecord[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { userId },
    });

    return records.map((r) => this.toModel(r));
  }

  async findBySession(sessionId: number): Promise<AttendanceRecord[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId },
    });

    return records.map((r) => this.toModel(r));
  }

  async bulkUpsert(records: AttendanceRecord[]): Promise<void> {
    if (records.length === 0) return;

    await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            sessionId_userId: { sessionId: r.sessionId, userId: r.userId },
          },
          create: {
            sessionId: r.sessionId,
            userId: r.userId,
            status: r.status,
            checkedInAt: r.checkedInAt,
            latitude: r.latitude ?? undefined,
            longitude: r.longitude ?? undefined,
            accuracy: r.accuracy ?? undefined,
            updatedBy: r.updateBy ?? undefined,
          },
          update: {
            status: r.status,
            checkedInAt: r.checkedInAt,
            latitude: r.latitude ?? undefined,
            longitude: r.longitude ?? undefined,
            accuracy: r.accuracy ?? undefined,
            updatedBy: r.updateBy ?? undefined,
          },
        }),
      ),
    );
  }

  private toModel(record: PrismaAttendanceRecord): AttendanceRecord {
    return {
      sessionId: record.sessionId,
      userId: record.userId,
      status: record.status,
      checkedInAt: record.checkedInAt,
      latitude: record.latitude ? Number(record.latitude) : null,
      longitude: record.longitude ? Number(record.longitude) : null,
      accuracy: record.accuracy ? Number(record.accuracy) : null,
      updateBy: record.updatedBy,
      updatedAt: record.updatedAt,
    };
  }
}
