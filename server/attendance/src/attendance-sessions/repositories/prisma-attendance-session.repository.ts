import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { SessionStatus } from '@gps-attendance/shared';
import type { AttendanceSession, CreateAttendanceSessionRecord } from '../attendance-session.model';
import type { IAttendanceSessionRepository } from '../attendance-session.repository';

@Injectable()
export class PrismaAttendanceSessionRepository implements IAttendanceSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAttendanceSessionRecord): Promise<AttendanceSession> {
    const session = await this.prisma.attendanceSession.create({
      data: {
        ...input,
        latitude: input.latitude,
        longitude: input.longitude,
        radius: input.radius,
      },
    });
    return this.toModel(session);
  }

  async createWithRecords(
    input: CreateAttendanceSessionRecord,
    userIds: number[],
  ): Promise<AttendanceSession> {
    const session = await this.prisma.$transaction(async (transaction) => {
      const createdSession = await transaction.attendanceSession.create({
        data: {
          ...input,
          latitude: input.latitude,
          longitude: input.longitude,
          radius: input.radius,
        },
      });

      if (userIds.length > 0) {
        await transaction.attendanceRecord.createMany({
          data: userIds.map((userId) => ({
            sessionId: createdSession.id,
            userId,
            status: 'absent' as const,
            updatedBy: null,
          })),
        });
      }

      return createdSession;
    });

    return this.toModel(session);
  }

  async findAll(): Promise<AttendanceSession[]> {
    const sessions = await this.prisma.attendanceSession.findMany({ orderBy: { id: 'desc' } });
    return sessions.map((session) => this.toModel(session));
  }

  async findById(id: number): Promise<AttendanceSession | null> {
    const session = await this.prisma.attendanceSession.findUnique({ where: { id } });
    return session ? this.toModel(session) : null;
  }

  async findByIds(ids: number[]): Promise<AttendanceSession[]> {
    const sessions = await this.prisma.attendanceSession.findMany({ where: { id: { in: ids } } });
    return sessions.map((session) => this.toModel(session));
  }

  async findByCreator(createdBy: number): Promise<AttendanceSession[]> {
    const sessions = await this.prisma.attendanceSession.findMany({ where: { createdBy } });
    return sessions.map((session) => this.toModel(session));
  }

  async close(id: number): Promise<AttendanceSession> {
    const session = await this.prisma.attendanceSession.update({
      where: { id },
      data: { closeAt: new Date() },
    });
    return this.toModel(session);
  }

  async cancel(id: number): Promise<AttendanceSession> {
    const session = await this.prisma.attendanceSession.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return this.toModel(session);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.attendanceSession.delete({ where: { id } });
  }

  private toModel(session: {
    id: number;
    title: string;
    latitude: unknown;
    longitude: unknown;
    radius: unknown;
    openAt: Date;
    closeAt: Date;
    status: string;
    createdBy: number;
    createdAt: Date;
    updatedAt: Date;
  }): AttendanceSession {
    return {
      ...session,
      latitude: Number(session.latitude),
      longitude: Number(session.longitude),
      radius: Number(session.radius),
      status: (session.status === 'cancelled' ? 'cancelled' : 'pending') as SessionStatus,
    };
  }
}