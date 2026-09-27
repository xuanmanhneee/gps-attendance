import { Injectable } from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { UsersService } from '../users/users.service';
import { AttendanceSession } from './attendance-session.model';
import { AttendanceRecord } from '../attendance-record/attendance-record.model';
import { User } from '../users/user.model';
import { AttendanceSessionDetailResponse, AttendanceAttemptDto } from '@gps-attendance/shared';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class AttendanceSessionQueryService {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async getDetail(
    sessionId: number,
    user: { userId: number; role: string },
  ): Promise<AttendanceSessionDetailResponse> {
    const session =
      await this.attendanceSessionsService.findByIdForUser(sessionId, user);

    const records =
      await this.attendanceRecordsService.findBySessionId(sessionId);

    const users = await this.usersService.findByIds(
      records.map(record => record.userId),
    );

    const attempts = await this.prisma.attendanceAttempt.findMany({
      where: { sessionId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedAttempts: AttendanceAttemptDto[] = attempts.map(attempt => ({
      id: attempt.id,
      userId: attempt.userId,
      userCode: attempt.user.code,
      userFullname: attempt.user.fullname,
      latitude: Number(attempt.latitude),
      longitude: Number(attempt.longitude),
      accuracy: Number(attempt.accuracy),
      distanceToCenter: Number(attempt.distanceToCenter),
      deviceId: attempt.deviceId,
      isMockLocation: attempt.isMockLocation,
      serverTimestamp: attempt.serverTimestamp.toISOString(),
      result: attempt.result,
      reasons: attempt.reasons,
    }));

    return this.toDetail(session, records, users, mappedAttempts);
  }

  private toDetail(
    session: AttendanceSession,
    records: AttendanceRecord[],
    users: User[],
    attempts: AttendanceAttemptDto[],
  ): AttendanceSessionDetailResponse {
    const usersById = new Map(
      users.map(user => [user.id, user]),
    );

    return {
      id: session.id,
      title: session.title,
      latitude: session.latitude,
      longitude: session.longitude,
      radius: session.radius,
      openAt: session.openAt.toISOString(),
      closeAt: session.closeAt.toISOString(),
      status: session.status,

      participants: records.map(record => {
        const user = usersById.get(record.userId);

        if (!user) {
          throw new Error(`User ${record.userId} not found`);
        }

        return {
          user: {
            code: user.code,
            role: user.role,
            fullname: user.fullname,
          },
          status: record.status,
          checkinAt: record.checkedInAt?.toISOString() ?? null,
          updatedAt: record.updatedAt?.toISOString() ?? null,
        };
      }),

      attempts,
    };
  }
}