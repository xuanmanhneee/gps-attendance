import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AttendanceSessionErrorCode, SessionStatus } from '@gps-attendance/shared';

import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { PrismaService } from '../common/database/prisma.service';
import { AttendanceSession } from './attendance-session.model';
import { IAttendanceSessionRepository } from './attendance-session.repository';
import { ATTENDANCE_SESSION_REPOSITORY } from './attendance-session.token';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { JOB_SCHEDULER } from '../job-scheduler/job-scheduler.token';
import { IJobScheduler } from '../job-scheduler/job-scheduler.interface';
import { REVIEW_RESOLUTION_WINDOW_MS } from '../attendance-record/attendance-review.constants';
import { RedisService } from '../redis/redis.service';
import {
  attendanceSessionCacheKey,
  lecturerVerificationCacheKey,
} from './attendance-session-cache';

const SESSION_FLUSH_JOB = 'attendance-session.flush';
const SESSION_CACHE_TTL_SECONDS = 86_400;
const LECTURER_VERIFICATION_CACHE_TTL_SECONDS = 300;
const sessionFlushJobId = (sessionId: number) =>
  `attendance-session:flush:${sessionId}`;

const UPDATE_LATEST_LECTURER_VERIFICATION_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
local next = cjson.decode(ARGV[1])
if not raw then
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
  return 1
end
local current = cjson.decode(raw)
if current.verifiedAt == nil or current.verifiedAt == cjson.null or
   next.verifiedAt > current.verifiedAt then
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
  return 1
end
return 0
`;

@Injectable()
export class AttendanceSessionsService {
  private readonly logger = new Logger(AttendanceSessionsService.name);

  constructor(
    @Inject(ATTENDANCE_SESSION_REPOSITORY)
    private readonly attendanceSessionRepository: IAttendanceSessionRepository,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly prisma: PrismaService,
    @Inject(JOB_SCHEDULER)
    private readonly jobScheduler: IJobScheduler,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async create(
    dto: CreateAttendanceSessionDto,
    createdBy: number,
    creatorRole: string,
  ): Promise<AttendanceSession> {
    const openAt = new Date(dto.openAt);
    const closeAt = new Date(dto.closeAt);
    if (closeAt <= openAt) {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_TIME_RANGE,
        message: 'Thời gian đóng session phải sau thời gian mở',
      });
    }

    const resolved = await this.resolveSessionContext(dto, createdBy, creatorRole);
    const session = await this.attendanceSessionRepository.createWithRecords({
      title: dto.title,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      radius: resolved.radius,
      gpsAccuracyThreshold: resolved.gpsAccuracyThreshold,
      lecturerValidationRadius: resolved.lecturerValidationRadius,
      buildingId: resolved.buildingId,
      roomId: resolved.roomId,
      timetableSlotId: resolved.timetableSlotId,
      courseSectionId: resolved.courseSectionId,
      locationSource: resolved.locationSource,
      openAt,
      closeAt,
      createdBy,
    }, resolved.userIds);

    await this.attendanceRecordsService.initializeBufferForSession(
      session.id,
      resolved.userIds,
    );
    await this.jobScheduler.schedule(
      SESSION_FLUSH_JOB,
      new Date(closeAt.getTime() + REVIEW_RESOLUTION_WINDOW_MS),
      { sessionId: session.id },
      sessionFlushJobId(session.id),
    );

    const result = this.withComputedStatus(session);
    await this.cacheSession(result);
    return result;
  }

  private async resolveSessionContext(
    dto: CreateAttendanceSessionDto,
    createdBy: number,
    creatorRole: string,
  ): Promise<{
    latitude: number;
    longitude: number;
    radius: number;
    gpsAccuracyThreshold: number | null;
    lecturerValidationRadius: number | null;
    buildingId: number | null;
    roomId: number | null;
    timetableSlotId: number | null;
    courseSectionId: number | null;
    locationSource: 'MANUAL' | 'BUILDING_REGISTRY';
    userIds: number[];
  }> {
    if (dto.courseSectionId !== undefined) {
      const section = await this.prisma.courseSection.findUnique({
        where: { id: dto.courseSectionId },
        include: {
          room: { include: { registryBuilding: true } },
          timetable: { include: { room: { include: { registryBuilding: true } } } },
          enrollments: {
            where: { status: 'active' },
            select: { userId: true },
          },
        },
      });

      if (!section) {
        throw new NotFoundException('Không tìm thấy lớp học phần');
      }
      if (creatorRole !== 'admin' && section.lecturerId !== createdBy) {
        throw new ForbiddenException('Bạn không được phân công giảng dạy lớp học phần này');
      }

      if (section.enrollments.length === 0) {
        throw new BadRequestException(
          'Lớp học phần chưa có sinh viên ghi danh active; hãy nhập roster trước khi tạo phiên.',
        );
      }
      if (section.timetable.length === 0) {
        throw new BadRequestException(
          'Lớp học phần chưa có thời khóa biểu; hãy khai báo ca học trước khi tạo phiên.',
        );
      }
      if (dto.timetableSlotId === undefined) {
        throw new BadRequestException('Lớp có thời khóa biểu; cần chọn ca học cụ thể');
      }

      const slot = dto.timetableSlotId === undefined
        ? undefined
        : section.timetable.find((item) => item.id === dto.timetableSlotId);
      if (dto.timetableSlotId !== undefined && !slot) {
        throw new BadRequestException('Thời khóa biểu không thuộc lớp học phần đã chọn');
      }
      if (slot) {
        const openAt = new Date(dto.openAt);
        const localDateParts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(openAt);
        const localDatePart = (type: 'year' | 'month' | 'day') =>
          localDateParts.find((part) => part.type === type)?.value ?? '';
        const selectedLocalDate =
          `${localDatePart('year')}-${localDatePart('month')}-${localDatePart('day')}`;
        if (slot.scheduledDate) {
          if (selectedLocalDate !== slot.scheduledDate.toISOString().slice(0, 10)) {
            throw new BadRequestException('Ngày mở session không khớp ngày cụ thể của ca học đã chọn');
          }
        } else {
          const localWeekday = new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            timeZone: 'Asia/Ho_Chi_Minh',
          }).format(openAt);
          const weekdayToNumber: Record<string, number> = {
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
            Sat: 6,
            Sun: 7,
          };
          if (weekdayToNumber[localWeekday] !== slot.dayOfWeek) {
            throw new BadRequestException('Ngày mở session không khớp ngày của ca học đã chọn');
          }
        }
      }

      const room = slot?.room ?? section.room;
      const building = room?.registryBuilding;
      if (!room || room.status !== 'ACTIVE' || !building) {
        throw new BadRequestException('Phòng học chưa được liên kết với Building trong Location Registry');
      }
      if (building.type !== 'BUILDING' || building.status !== 'ACTIVE') {
        throw new BadRequestException('Địa điểm của phòng không phải tòa nhà đang hoạt động');
      }
      if (
        !building.verified ||
        building.geofenceRadius === null ||
        building.gpsAccuracyThreshold === null
      ) {
        throw new BadRequestException('Building chưa được hiệu chuẩn GPS; chưa thể tạo session');
      }

      return {
        latitude: Number(building.latitude),
        longitude: Number(building.longitude),
        radius: Number(building.geofenceRadius),
        gpsAccuracyThreshold: Number(building.gpsAccuracyThreshold),
        lecturerValidationRadius:
          building.lecturerValidationRadius === null
            ? null
            : Number(building.lecturerValidationRadius),
        buildingId: building.id,
        roomId: room.id,
        timetableSlotId: slot?.id ?? null,
        courseSectionId: section.id,
        locationSource: 'BUILDING_REGISTRY',
        userIds: section.enrollments.map((enrollment) => enrollment.userId),
      };
    }

    throw new BadRequestException(
      dto.timetableSlotId !== undefined
        ? 'Cần chỉ định lớp học phần khi chọn thời khóa biểu'
        : 'Session phải được tạo từ lớp học phần có phòng liên kết với Building đã xác minh trong Location Registry',
    );
  }

  async findAll(): Promise<AttendanceSession[]> {
    const sessions = await this.attendanceSessionRepository.findAll();
    return sessions.map((session) => this.withComputedStatus(session));
  }

  async findById(id: number): Promise<AttendanceSession> {
    const cached = await this.getCachedSession(id);
    if (cached) return this.withComputedStatus(cached);

    const session = await this.attendanceSessionRepository.findById(id);
    if (!session) {
      throw new NotFoundException(`Không tìm thấy session id=${id}`);
    }
    if (this.redisService) {
      await this.redisService.set(
        attendanceSessionCacheKey(id),
        JSON.stringify(session),
        { ttlSec: SESSION_CACHE_TTL_SECONDS, ifNotExists: true },
      );
    }
    return this.withComputedStatus(session);
  }

  async findLatestLecturerVerification(sessionId: number): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    verifiedAt: Date;
  } | null> {
    if (this.redisService) {
      const cached = await this.redisService.get(
        lecturerVerificationCacheKey(sessionId),
      );
      if (cached !== null) {
        return this.parseLecturerVerification(cached);
      }
    }

    const verification = await this.prisma.lecturerLocationVerification.findFirst({
      where: { sessionId, status: 'PASS' },
      orderBy: { createdAt: 'desc' },
    });
    const result = verification
      ? {
          latitude: Number(verification.latitude),
          longitude: Number(verification.longitude),
          accuracy: Number(verification.accuracy),
          verifiedAt: verification.createdAt,
        }
      : null;
    if (this.redisService) {
      await this.redisService.set(
        lecturerVerificationCacheKey(sessionId),
        JSON.stringify(result ?? { verifiedAt: null }),
        { ttlSec: LECTURER_VERIFICATION_CACHE_TTL_SECONDS, ifNotExists: true },
      );
    }
    return result;
  }

  async cacheLecturerLocationVerification(
    sessionId: number,
    verification: {
      latitude: number;
      longitude: number;
      accuracy: number;
      verifiedAt: Date;
    },
  ): Promise<void> {
    if (!this.redisService) return;
    await this.redisService.eval(
      UPDATE_LATEST_LECTURER_VERIFICATION_SCRIPT,
      [lecturerVerificationCacheKey(sessionId)],
      [
        JSON.stringify({
          ...verification,
          verifiedAt: verification.verifiedAt.toISOString(),
        }),
        String(LECTURER_VERIFICATION_CACHE_TTL_SECONDS),
      ],
    );
  }

  async findByIdForUser(
    id: number,
    user: { userId: number; role: string },
  ): Promise<AttendanceSession> {
    const session = await this.findById(id);

    if (user.role !== 'admin' && session.createdBy !== user.userId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập phiên điểm danh này',
      );
    }

    return session;
  }

  async findByUser(userId: number): Promise<AttendanceSession[]> {
    const records = await this.attendanceRecordsService.findByUser(userId);
    const assignedSessionIds = new Set(records.map((record) => record.sessionId));

    const allSessions = await this.attendanceSessionRepository.findAll();
    const now = new Date();

    const relevantSessions = allSessions.filter((session) =>
      assignedSessionIds.has(session.id),
    );

    return relevantSessions.map((session) => this.withComputedStatus(session));
  }

  async findByCreator(createdBy: number): Promise<AttendanceSession[]> {
    const sessions = await this.attendanceSessionRepository.findByCreator(
      createdBy,
    );
    return sessions.map((session) => this.withComputedStatus(session));
  }

  async delete(
    id: number,
    user: { userId: number; role: string },
  ): Promise<void> {
    const session = await this.attendanceSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException(`Không tìm thấy session id=${id}`);
    }

    if (user.role !== 'admin' && session.createdBy !== user.userId) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa phiên điểm danh này',
      );
    }

    const [attemptCount, historyEventCount, auditLogCount] = await Promise.all([
      this.prisma.attendanceAttempt.count({ where: { sessionId: id } }),
      this.prisma.attendanceHistoryEvent.count({ where: { sessionId: id } }),
      this.prisma.auditLog.count({
        where: { entityType: 'AttendanceSession', entityId: String(id) },
      }),
    ]);
    if (attemptCount > 0 || historyEventCount > 0 || auditLogCount > 0) {
      throw new ConflictException(
        'Session đã có evidence/audit history; hãy đóng hoặc hủy thay vì xóa dữ liệu đối soát',
      );
    }

    await this.jobScheduler.cancel(sessionFlushJobId(id));
    await this.attendanceSessionRepository.delete(id);
    if (this.redisService) {
      await this.redisService.del(attendanceSessionCacheKey(id));
      await this.redisService.del(lecturerVerificationCacheKey(id));
    }
  }

  async findByIds(ids: number[]): Promise<AttendanceSession[]> {
    const sessions = await this.attendanceSessionRepository.findByIds(ids);
    return sessions.map((session) => this.withComputedStatus(session));
  }

  async close(
    id: number,
    user: { userId: number; role: string },
  ): Promise<AttendanceSession> {
    const session = await this.attendanceSessionRepository.findById(id);


    if (!session) {
      throw new NotFoundException(`Không tìm thấy session id=${id}`);
    }

    if (user.role !== 'admin' && session.createdBy !== user.userId) {
      throw new ForbiddenException(
        'Bạn không có quyền đóng phiên điểm danh này',
      );
    }

    const updated = await this.attendanceSessionRepository.close(id);
    await this.jobScheduler.schedule(
      SESSION_FLUSH_JOB,
      new Date(
        updated.closeAt.getTime() + REVIEW_RESOLUTION_WINDOW_MS,
      ),
      { sessionId: id },
      sessionFlushJobId(id),
    );
    const result = this.withComputedStatus(updated);
    await this.cacheSession(result);
    return result;
  }

  async cancel(
    id: number,
    user: { userId: number; role: string },
  ): Promise<AttendanceSession> {
    const session = await this.attendanceSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException({
        code: AttendanceSessionErrorCode.NOT_FOUND,
        message: `Không tìm thấy session id=${id}`,
      });
    }

    if (user.role !== 'admin' && session.createdBy !== user.userId) {
      throw new ForbiddenException({
        code: AttendanceSessionErrorCode.CANCEL_FORBIDDEN,
        message: 'Bạn không có quyền hủy phiên điểm danh này',
      });
    }

    const current = this.withComputedStatus(session);
    if (current.status === 'closed' || current.status === 'cancelled') {
      throw new ConflictException({
        code: AttendanceSessionErrorCode.CANCEL_INVALID_STATUS,
        message: `Không thể hủy phiên đang ở trạng thái "${current.status}"`,
      });
    }

    const updated = await this.attendanceSessionRepository.cancel(id);
    await this.jobScheduler.schedule(
      SESSION_FLUSH_JOB,
      new Date(),
      { sessionId: id },
      sessionFlushJobId(id),
    );
    const result = this.withComputedStatus(updated);
    await this.cacheSession(result);
    return result;
  }

  private async cacheSession(session: AttendanceSession): Promise<void> {
    if (!this.redisService) return;
    await this.redisService.set(
      attendanceSessionCacheKey(session.id),
      JSON.stringify(session),
      { ttlSec: SESSION_CACHE_TTL_SECONDS },
    );
    await this.redisService.set(
      lecturerVerificationCacheKey(session.id),
      JSON.stringify({ verifiedAt: null }),
      { ttlSec: LECTURER_VERIFICATION_CACHE_TTL_SECONDS, ifNotExists: true },
    );
  }

  private async getCachedSession(
    id: number,
  ): Promise<AttendanceSession | null> {
    if (!this.redisService) return null;
    const key = attendanceSessionCacheKey(id);
    const raw = await this.redisService.get(key);
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as AttendanceSession;
      const session = {
        ...parsed,
        openAt: new Date(parsed.openAt),
        closeAt: new Date(parsed.closeAt),
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
      };
      if (
        session.id !== id ||
        !Number.isFinite(session.openAt.getTime()) ||
        !Number.isFinite(session.closeAt.getTime()) ||
        !Number.isFinite(session.createdAt.getTime()) ||
        !Number.isFinite(session.updatedAt.getTime())
      ) {
        throw new Error('Invalid cached session data');
      }
      return session;
    } catch (error) {
      this.logger.warn(
        `Invalid cached attendance session ${id}; loading from PostgreSQL: ${(error as Error).message}`,
      );
      await this.redisService.del(key);
      return null;
    }
  }

  private parseLecturerVerification(raw: string): {
    latitude: number;
    longitude: number;
    accuracy: number;
    verifiedAt: Date;
  } | null {
    const parsed = JSON.parse(raw) as {
      latitude?: unknown;
      longitude?: unknown;
      accuracy?: unknown;
      verifiedAt?: unknown;
    };
    if (parsed.verifiedAt === null) return null;
    const verifiedAt = new Date(String(parsed.verifiedAt));
    if (
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number' ||
      typeof parsed.accuracy !== 'number' ||
      !Number.isFinite(verifiedAt.getTime())
    ) {
      throw new Error('Cached lecturer verification is invalid');
    }
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      accuracy: parsed.accuracy,
      verifiedAt,
    };
  }

  private withComputedStatus(session: AttendanceSession): AttendanceSession {
    if (session.status === 'cancelled') {
      return session;
    }

    const now = new Date();
    let status: SessionStatus = 'pending';

    if (now >= session.openAt && now <= session.closeAt) {
      status = 'open';
    } else if (now > session.closeAt) {
      status = 'closed';
    }

    return { ...session, status };
  }
}
