import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { SessionStatus } from '@gps-attendance/shared';
import type { AttendanceSession, CreateAttendanceSessionRecord } from '../attendance-session.model';
import type { IAttendanceSessionRepository } from '../attendance-session.repository';

const sessionLocationInclude = {
  building: { select: { id: true, code: true, name: true } },
  room: { select: { id: true, code: true, name: true, floor: true } },
} as const;

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
      include: sessionLocationInclude,
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
        include: sessionLocationInclude,
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
        await transaction.attendanceHistoryEvent.createMany({
          data: userIds.map((userId) => ({
            sessionId: createdSession.id,
            userId,
            actorId: input.createdBy,
            eventType: 'SESSION_CREATED' as const,
            status: 'absent' as const,
            reasons: [],
          })),
        });
      }

      await transaction.auditLog.create({
        data: {
          actorUserId: input.createdBy,
          action: 'SESSION_CREATED',
          entityType: 'AttendanceSession',
          entityId: String(createdSession.id),
          metadata: {
            locationSource: input.locationSource ?? 'MANUAL',
            buildingId: input.buildingId ?? null,
            roomId: input.roomId ?? null,
            timetableSlotId: input.timetableSlotId ?? null,
            latitude: input.latitude,
            longitude: input.longitude,
            radius: input.radius,
          },
        },
      });

      return createdSession;
    });

    return this.toModel(session);
  }

  async findAll(): Promise<AttendanceSession[]> {
    const sessions = await this.prisma.attendanceSession.findMany({
      orderBy: { id: 'desc' },
      include: sessionLocationInclude,
    });
    return sessions.map((session) => this.toModel(session));
  }

  async findById(id: number): Promise<AttendanceSession | null> {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: sessionLocationInclude,
    });
    return session ? this.toModel(session) : null;
  }

  async findByIds(ids: number[]): Promise<AttendanceSession[]> {
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { id: { in: ids } },
      include: sessionLocationInclude,
    });
    return sessions.map((session) => this.toModel(session));
  }

  async findByCreator(createdBy: number): Promise<AttendanceSession[]> {
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { createdBy },
      include: sessionLocationInclude,
    });
    return sessions.map((session) => this.toModel(session));
  }

  async close(id: number): Promise<AttendanceSession> {
    const session = await this.prisma.attendanceSession.update({
      where: { id },
      data: { closeAt: new Date() },
      include: sessionLocationInclude,
    });
    return this.toModel(session);
  }

  async cancel(id: number): Promise<AttendanceSession> {
    const session = await this.prisma.attendanceSession.update({
      where: { id },
      data: { status: 'cancelled' },
      include: sessionLocationInclude,
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
    gpsAccuracyThreshold: unknown;
    lecturerValidationRadius: unknown;
    buildingId: number | null;
    roomId: number | null;
    timetableSlotId: number | null;
    locationSource: string;
    building: { id: number; code: string; name: string } | null;
    room: { id: number; code: string; name: string; floor: string | null } | null;
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
      gpsAccuracyThreshold:
        session.gpsAccuracyThreshold === null
          ? null
          : Number(session.gpsAccuracyThreshold),
      lecturerValidationRadius:
        session.lecturerValidationRadius === null
          ? null
          : Number(session.lecturerValidationRadius),
      locationSource: session.locationSource as AttendanceSession['locationSource'],
      building: session.building,
      room: session.room,
      status: (session.status === 'cancelled' ? 'cancelled' : 'pending') as SessionStatus,
    };
  }
}