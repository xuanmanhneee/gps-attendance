// repository/prisma-attendance-session.repository.ts
import { Injectable } from '@nestjs/common';
import { AttendanceSession as PrismaAttendanceSession } from '#prisma/generated/client'; // chỉnh path đúng theo project

import {
  AttendanceSession,
  CreateAttendanceSessionRecord,
} from '../../attendance-session.model';
import { IAttendanceSessionRepository } from '../../attendance-session.repository';
import { PrismaService } from '#prisma/prisma.service'; // chỉnh path đúng theo project

@Injectable()
export class PrismaAttendanceSessionRepository implements IAttendanceSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateAttendanceSessionRecord,
  ): Promise<AttendanceSession> {
    const record = await this.prisma.attendanceSession.create({
      data: {
        title: input.title,
        latitude: input.latitude,
        longitude: input.longitude,
        radius: input.radius,
        openAt: input.openAt,
        closeAt: input.closeAt,
        createdBy: input.createdBy,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        // status không ảnh hưởng business logic hiện tại (luôn bị tính lại
        // qua withComputedStatus ở tầng service dựa theo openAt/closeAt),
        // giữ mặc định 'draft' của Prisma.
      },
    });

    return this.toModel(record);
  }

  async updateStatus(id: number, status: 'cancelled'): Promise<void> {
    await this.prisma.attendanceSession.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }

  async findAll(): Promise<AttendanceSession[]> {
    const records = await this.prisma.attendanceSession.findMany();
    return records.map((r) => this.toModel(r));
  }

  async findById(id: number): Promise<AttendanceSession | null> {
    const record = await this.prisma.attendanceSession.findUnique({
      where: { id },
    });
    return record ? this.toModel(record) : null;
  }

  async findByIds(ids: number[]): Promise<AttendanceSession[]> {
    const records = await this.prisma.attendanceSession.findMany({
      where: { id: { in: ids } },
    });
    return records.map((r) => this.toModel(r));
  }

  async findByCreator(createdBy: number): Promise<AttendanceSession[]> {
    const records = await this.prisma.attendanceSession.findMany({
      where: { createdBy },
    });
    return records.map((r) => this.toModel(r));
  }

  private toModel(record: PrismaAttendanceSession): AttendanceSession {
    return {
      id: record.id,
      title: record.title,
      latitude: Number(record.latitude),
      longitude: Number(record.longitude),
      radius: Number(record.radius),
      openAt: record.openAt,
      closeAt: record.closeAt,
      // Giá trị này sẽ bị withComputedStatus ghi đè ngay sau khi đọc ra
      // khỏi service, nên chỉ cần map tạm cho đủ kiểu, không ảnh hưởng
      // logic thật. 'cancelled' hiện chưa có tương đương ở TS SessionStatus
      // — map tạm về 'pending', cần xem lại nếu sau này dùng tính năng huỷ session.
      status:
        record.status === 'open' || record.status === 'closed'
          ? record.status
          : 'pending',
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
