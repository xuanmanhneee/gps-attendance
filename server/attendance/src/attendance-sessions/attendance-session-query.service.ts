import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { UsersService } from '../users/users.service';
import { AttendanceSession } from './attendance-session.model';
import { AttendanceRecord } from '../attendance-record/attendance-record.model';
import { User } from '../users/user.model';
import {
  AttendanceSessionResponse,
  AttendanceSessionDetailResponse,
  AttendanceAttemptDto,
  AttendanceReviewDecision,
  LecturerAttendanceAnalytics,
  MyAttendanceSessionResponse,
} from '@gps-attendance/shared';
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
    user?: { userId: number; role: string },
  ): Promise<AttendanceSessionDetailResponse> {
    const session = user
      ? await this.attendanceSessionsService.findByIdForUser(sessionId, user)
      : await this.attendanceSessionsService.findById(sessionId);

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

    const mappedAttempts: AttendanceAttemptDto[] = attempts.map((attempt) => ({
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
      reviewedAt: attempt.reviewedAt?.toISOString() ?? null,
      reviewedBy: attempt.reviewedBy,
      reviewNote: attempt.reviewNote,
    }));

    return this.toDetail(session, records, users, mappedAttempts);
  }

  async getLecturerAnalytics(
    lecturerId: number,
    isAdmin = false,
  ): Promise<LecturerAttendanceAnalytics> {
    const sessions = await this.prisma.attendanceSession.findMany({
      where: isAdmin ? {} : { createdBy: lecturerId },
      select: {
        attendanceRecords: {
          select: {
            userId: true,
            status: true,
            user: { select: { code: true, fullname: true } },
          },
        },
        attempts: {
          where: { result: 'REVIEW' },
          select: { id: true },
        },
      },
    });

    const records = sessions.flatMap((session) => session.attendanceRecords);
    const count = (status: string) =>
      records.filter((record) => record.status === status).length;
    const presentCount = count('present');
    const lateCount = count('late');
    const absentCount = count('absent');
    const excusedCount = count('excused');
    const totalRecords = records.length;
    const attendanceRate = totalRecords
      ? Math.round(
          ((presentCount + lateCount + excusedCount) / totalRecords) * 100,
        )
      : 0;

    const byStudent = new Map<
      number,
      { userCode: string; fullname: string; absentCount: number; total: number; attended: number }
    >();
    for (const record of records) {
      const student = byStudent.get(record.userId) ?? {
        userCode: record.user.code,
        fullname: record.user.fullname,
        absentCount: 0,
        total: 0,
        attended: 0,
      };
      student.total += 1;
      if (record.status === 'absent') student.absentCount += 1;
      if (record.status === 'present' || record.status === 'late' || record.status === 'excused') {
        student.attended += 1;
      }
      byStudent.set(record.userId, student);
    }

    const atRiskStudents = [...byStudent.entries()]
      .map(([userId, student]) => ({
        userId,
        userCode: student.userCode,
        fullname: student.fullname,
        absentCount: student.absentCount,
        totalSessions: student.total,
        attendanceRate: Math.round((student.attended / student.total) * 100),
      }))
      .filter((student) => student.absentCount > 0)
      .sort((left, right) =>
        right.absentCount - left.absentCount || left.attendanceRate - right.attendanceRate,
      )
      .slice(0, 10);

    return {
      totalSessions: sessions.length,
      totalStudents: byStudent.size,
      totalRecords,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      attendanceRate,
      reviewCount: sessions.reduce((sum, session) => sum + session.attempts.length, 0),
      atRiskStudents,
    };
  }

  async reviewAttempt(
    sessionId: number,
    attemptId: number,
    reviewerId: number,
    reviewerRole: string,
    decision: AttendanceReviewDecision,
    note: string,
  ): Promise<void> {
    await this.attendanceSessionsService.findByIdForUser(sessionId, {
      userId: reviewerId,
      role: reviewerRole,
    });

    const attempt = await this.prisma.attendanceAttempt.findFirst({
      where: { id: attemptId, sessionId },
    });
    if (!attempt) {
      throw new NotFoundException('Không tìm thấy lượt điểm danh cần xem xét');
    }
    if (attempt.result !== 'REVIEW') {
      throw new ConflictException('Lượt điểm danh này đã được xử lý');
    }

    const reviewedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      const updateResult = await transaction.attendanceAttempt.updateMany({
        where: { id: attemptId, sessionId, result: 'REVIEW' },
        data: {
          result: decision,
          reviewedBy: reviewerId,
          reviewedAt,
          reviewNote: note,
        },
      });
      if (updateResult.count !== 1) {
        throw new ConflictException('Lượt điểm danh đã được xử lý trước đó');
      }

      const finalStatus = decision === 'APPROVED' ? 'present' : 'absent';

      await transaction.attendanceRecord.upsert({
        where: {
          sessionId_userId: { sessionId, userId: attempt.userId },
        },
        update: {
          status: finalStatus,
          deviceId: attempt.deviceId,
          checkedInAt:
            decision === 'APPROVED' ? attempt.serverTimestamp : null,
          latitude: attempt.latitude,
          longitude: attempt.longitude,
          accuracy: attempt.accuracy,
          distanceMeters: attempt.distanceToCenter,
          updatedBy: reviewerId,
        },
        create: {
          sessionId,
          userId: attempt.userId,
          status: finalStatus,
          deviceId: attempt.deviceId,
          checkedInAt:
            decision === 'APPROVED' ? attempt.serverTimestamp : null,
          latitude: attempt.latitude,
          longitude: attempt.longitude,
          accuracy: attempt.accuracy,
          distanceMeters: attempt.distanceToCenter,
          updatedBy: reviewerId,
        },
      });

      await transaction.attendanceHistoryEvent.create({
        data: {
          sessionId,
          userId: attempt.userId,
          actorId: reviewerId,
          attemptId,
          eventType: 'REVIEW_DECISION',
          status: finalStatus,
          attemptResult: decision,
          reasons: attempt.reasons,
          note,
        },
      });
    });
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

      attempts,
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
    };
  }
}
