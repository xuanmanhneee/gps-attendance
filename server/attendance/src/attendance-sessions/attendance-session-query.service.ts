import { Injectable } from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { UsersService } from '../users/users.service';
import { AttendanceSession } from './attendance-session.model';
import { AttendanceRecord } from '../attendance-record/attendance-record.model';
import { User } from '../users/user.model';
<<<<<<< HEAD
import { AttendanceSessionDetailResponse, AttendanceAttemptDto } from '@gps-attendance/shared';
import { PrismaService } from '../common/database/prisma.service';
=======
import {
  AttendanceSessionResponse,
  AttendanceSessionDetailResponse,
  MyAttendanceSessionResponse,
} from '@gps-attendance/shared';
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

@Injectable()
export class AttendanceSessionQueryService {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

<<<<<<< HEAD
  async getDetail(
    sessionId: number,
    user: { userId: number; role: string },
  ): Promise<AttendanceSessionDetailResponse> {
    const session =
      await this.attendanceSessionsService.findByIdForUser(sessionId, user);
=======
  async getDetail(sessionId: number): Promise<AttendanceSessionDetailResponse> {
    const session = await this.attendanceSessionsService.findById(sessionId);
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

    const records =
      await this.attendanceRecordsService.findBySessionId(sessionId);

    const users = await this.usersService.findByIds(
      records.map((record) => record.userId),
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
    const usersById = new Map(users.map((user) => [user.id, user]));

    return {
      ...this.toSessionBase(session),

      participants: records.map((record) => {
        const user = usersById.get(record.userId);

        if (!user) {
          throw new Error(`User ${record.userId} not found`);
        }

        return {
          user: {
            id: user.id,
            code: user.code,
            role: user.role,
            fullname: user.fullname,
          },
          status: record.status,
          checkedInAt: record.checkedInAt?.toISOString() ?? null,
          updatedAt: record.updatedAt.toISOString(),
        };
      }),
    };
  }

  async getMySessions(userId: number): Promise<MyAttendanceSessionResponse[]> {
    const records = await this.attendanceRecordsService.findByUser(userId);

    if (records.length === 0) return [];

    const sessionIds = records.map((r) => r.sessionId);
    const sessions = await this.attendanceSessionsService.findByIds(sessionIds);

    return this.toMySessionsResponse(sessions, records);
  }

  private toMySessionsResponse(
    sessions: AttendanceSession[],
    records: AttendanceRecord[],
  ): MyAttendanceSessionResponse[] {
    const recordBySessionId = new Map(
      records.map((record) => [record.sessionId, record]),
    );

    return sessions.map((session) => {
      const record = recordBySessionId.get(session.id);

      if (!record) {
        throw new Error(`Record cho session ${session.id} không tồn tại`);
      }

      return {
        ...this.toSessionBase(session),

        myAttendance: {
          status: record.status,
          checkedInAt: record.checkedInAt?.toISOString() ?? null,
        },
      };
    });
  }

  private toSessionBase(session: AttendanceSession): AttendanceSessionResponse {
    return {
      id: session.id,
      title: session.title,
      latitude: session.latitude,
      longitude: session.longitude,
      radius: session.radius,
      openAt: session.openAt.toISOString(),
      closeAt: session.closeAt.toISOString(),
      status: session.status,
<<<<<<< HEAD

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
=======
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
    };
  }
}
