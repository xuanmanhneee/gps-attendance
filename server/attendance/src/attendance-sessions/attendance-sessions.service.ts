import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceSessionErrorCode,
  SessionStatus,
  UserFilterCriteria,
  isValidUserFilterCriteria,
} from '@gps-attendance/shared';

import { IJobScheduler } from '#job-scheduler/job-scheduler.interface';
import { JOB_SCHEDULER } from '#job-scheduler/job-scheduler.token';
import { RedisService } from '#redis/redis.service';

import { AttendanceRecordsService } from '#attendance-record/attendance-records.service';
import { ILogger } from '#common/logging/logger.interface';
import { ILoggerFactory } from '#common/logging/logger.factory';
import { LOGGER_FACTORY } from '#common/logging/logger.token';
import { UserFilterService } from '../users/user-filter.service';

import { AttendanceSession } from './attendance-session.model';
import { IAttendanceSessionRepository } from './attendance-session.repository';
import { ATTENDANCE_SESSION_REPOSITORY } from './attendance-session.token';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { UpdateAttendanceSessionDto } from './dto/update-attendance-session.dto';
import {
  criteriaKeyFor,
  rosterInitializedKeyFor,
} from './attendance-session-keys';
import { REVIEW_RESOLUTION_WINDOW_MS } from '../attendance-record/attendance-review.constants';

const ROSTER_INIT_BUFFER_MS = 5 * 60 * 1000;

/** true nếu đã tới (hoặc qua) thời điểm khởi tạo roster */
const isRosterInitDue = (session: AttendanceSession): boolean =>
  Date.now() >= session.openAt.getTime() - ROSTER_INIT_BUFFER_MS;

const isOwner = (session: AttendanceSession, userId: number): boolean =>
  session.createdBy === userId;

const notOwnerError = () =>
  new ForbiddenException({
    code: AttendanceSessionErrorCode.FORBIDDEN,
    message: 'Chỉ giảng viên tạo session này mới được thao tác',
  });

@Injectable()
export class AttendanceSessionsService {
  private readonly logger: ILogger;

  constructor(
    @Inject(ATTENDANCE_SESSION_REPOSITORY)
    private readonly attendanceSessionRepository: IAttendanceSessionRepository,
    private readonly userFilterService: UserFilterService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly redisService: RedisService,

    @Inject(JOB_SCHEDULER)
    private readonly jobScheduler: IJobScheduler,

    @Inject(LOGGER_FACTORY)
    loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory.create(AttendanceSessionsService.name);
  }

  onModuleInit() {
    this.jobScheduler.onJob<{ sessionId: number }>(
      'attendance:init-roster',
      async (payload) => this.initializeRoster(payload.sessionId),
    );
  }

  async create(
    dto: CreateAttendanceSessionDto,
    createdBy: number,
  ): Promise<AttendanceSession> {
    // 1. Giá trị dẫn xuất
    const openAt = new Date(dto.openAt);
    const closeAt = new Date(dto.closeAt);
    const initAt = new Date(openAt.getTime() - ROSTER_INIT_BUFFER_MS);

    // 2. Guards (rẻ trước, tốn I/O sau)
    if (openAt >= closeAt || closeAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_TIME_RANGE,
        message: 'Khoảng thời gian không hợp lệ.',
      });
    }
    if (!isValidUserFilterCriteria(dto.participantCriteria)) {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_CRITERIA,
        message: 'participantCriteria không hợp lệ',
      });
    }
    await this.userFilterService.assertTagsOwnedBy(
      dto.participantCriteria,
      createdBy,
    );

    // 3. Ghi
    const session = await this.attendanceSessionRepository.create({
      title: dto.title,
      latitude: dto.latitude,
      longitude: dto.longitude,
      radius: dto.radius,
      openAt,
      closeAt,
      createdBy,
    });

    await this.redisService.set(
      criteriaKeyFor(session.id),
      JSON.stringify(dto.participantCriteria),
    );

    if (initAt.getTime() <= Date.now()) {
      await this.initializeRoster(session.id);
    } else {
      await this.jobScheduler.schedule(
        'attendance:init-roster',
        initAt,
        { sessionId: session.id },
        `init-roster:${session.id}`,
      );
    }
    await this.jobScheduler.schedule(
      'attendance:flush',
      new Date(session.closeAt.getTime() + REVIEW_RESOLUTION_WINDOW_MS),
      { sessionId: session.id },
      `flush:${session.id}`,
    );

    return this.withComputedStatus(session);
  }

  async update(
    sessionId: number,
    dto: UpdateAttendanceSessionDto,
    userId: number,
  ): Promise<AttendanceSession> {
    // 1. Load + giá trị dẫn xuất
    const session = await this.findById(sessionId);

    const openAt = dto.openAt ? new Date(dto.openAt) : session.openAt;
    const closeAt = dto.closeAt ? new Date(dto.closeAt) : session.closeAt;
    const isEnded =
      session.status === 'closed' || session.status === 'cancelled';
    const isOpen = session.status === 'open';
    const rosterLocked =
      session.status !== 'pending' || isRosterInitDue(session);
    const touchesLockedField = Object.entries(dto).some(
      ([key, value]) => key !== 'closeAt' && value !== undefined,
    );
    const initAt = openAt.getTime() - ROSTER_INIT_BUFFER_MS;

    // 2. Guards (rẻ trước, tốn I/O sau)
    if (!isOwner(session, userId)) throw notOwnerError();
    if (isEnded) {
      throw new ConflictException({
        code: AttendanceSessionErrorCode.UPDATE_INVALID_STATUS,
        message: `Không thể sửa session đang ở trạng thái "${session.status}"`,
      });
    }
    if (isOpen && touchesLockedField) {
      throw new ConflictException({
        code: AttendanceSessionErrorCode.UPDATE_FIELD_LOCKED,
        message: 'Session đang mở chỉ được sửa thời gian đóng.',
      });
    }
    if (dto.participantCriteria && rosterLocked) {
      throw new ConflictException({
        code: AttendanceSessionErrorCode.CRITERIA_LOCKED,
        message: 'Roster đã khởi tạo, không thể sửa criteria.',
      });
    }
    if (
      dto.participantCriteria &&
      !isValidUserFilterCriteria(dto.participantCriteria)
    ) {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_CRITERIA,
        message: 'participantCriteria không hợp lệ',
      });
    }
    if (openAt >= closeAt || closeAt <= new Date()) {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_TIME_RANGE,
        message: 'Khoảng thời gian không hợp lệ.',
      });
    }
    if (dto.participantCriteria) {
      await this.userFilterService.assertTagsOwnedBy(
        dto.participantCriteria,
        userId,
      );
    }

    // 3. Ghi
    const updated = await this.attendanceSessionRepository.update(sessionId, {
      title: dto.title,
      latitude: dto.latitude,
      longitude: dto.longitude,
      radius: dto.radius,
      openAt,
      closeAt,
    });

    if (dto.participantCriteria) {
      await this.redisService.set(
        criteriaKeyFor(sessionId),
        JSON.stringify(dto.participantCriteria),
      );
    }
    if (dto.openAt && !rosterLocked) {
      if (initAt <= Date.now()) {
        await this.jobScheduler.cancel(`init-roster:${sessionId}`);
        await this.initializeRoster(sessionId);
      } else {
        await this.reschedule('init-roster', sessionId, new Date(initAt));
      }
    }
    if (dto.closeAt) {
      await this.reschedule(
        'flush',
        sessionId,
        new Date(closeAt.getTime() + REVIEW_RESOLUTION_WINDOW_MS),
      );
    }

    return this.withComputedStatus(updated);
  }

  // Huỷ session — chỉ cho phép khi chưa đóng (pending hoặc open), chưa từng
  // bị huỷ trước đó. Nếu đang open, dọn luôn buffer để không lẫn dữ liệu
  // check-in dở dang vào lần flush kế (dù job flush đã bị cancel, phòng
  // trường hợp job đã trót chạy trước khi cancel kịp tới nơi).
  async cancel(sessionId: number, userId: number): Promise<AttendanceSession> {
    // 1. Load + giá trị dẫn xuất
    const session = await this.findById(sessionId);
    const isEnded =
      session.status === 'closed' || session.status === 'cancelled';
    const wasOpen = session.status === 'open';

    // 2. Guards
    if (!isOwner(session, userId)) throw notOwnerError();
    if (isEnded) {
      throw new ConflictException({
        code: AttendanceSessionErrorCode.CANCEL_INVALID_STATUS,
        message: `Không thể huỷ session ${sessionId} vì đang ở trạng thái "${session.status}"`,
      });
    }

    // 3. Ghi
    await this.attendanceSessionRepository.update(sessionId, {
      status: 'cancelled',
    });

    await this.jobScheduler.cancel(`init-roster:${sessionId}`);
    await this.jobScheduler.cancel(`flush:${sessionId}`);
    await this.redisService.del(criteriaKeyFor(sessionId));

    if (wasOpen) {
      await this.attendanceRecordsService.clearSessionBuffer(sessionId);
    }

    return { ...session, status: 'cancelled' };
  }

  // null = roster đã khởi tạo hoặc session đã huỷ, không còn criteria
  async getCriteria(
    sessionId: number,
    userId: number,
  ): Promise<UserFilterCriteria | null> {
    const session = await this.findById(sessionId);

    if (!isOwner(session, userId)) throw notOwnerError();

    return this.getPendingCriteria(sessionId);
  }

  // Criteria chỉ tồn tại trước khi roster được khởi tạo xong.
  async getPendingCriteria(
    sessionId: number,
  ): Promise<UserFilterCriteria | null> {
    if (
      (await this.redisService.get(rosterInitializedKeyFor(sessionId))) === '1'
    ) {
      return null;
    }
    const raw = await this.redisService.get(criteriaKeyFor(sessionId));
    return raw ? (JSON.parse(raw) as UserFilterCriteria) : null;
  }

  async findAll(): Promise<AttendanceSession[]> {
    const sessions = await this.attendanceSessionRepository.findAll();

    return sessions.map((session) => this.withComputedStatus(session));
  }

  async findById(id: number): Promise<AttendanceSession> {
    const session = await this.attendanceSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException({
        code: AttendanceSessionErrorCode.NOT_FOUND,
        message: `Không tìm thấy session id=${id}`,
      });
    }

    return this.withComputedStatus(session);
  }

  async findByIds(ids: number[]): Promise<AttendanceSession[]> {
    const sessions = await this.attendanceSessionRepository.findByIds(ids);
    return sessions.map((session) => this.withComputedStatus(session));
  }

  async findByUser(userId: number): Promise<AttendanceSession[]> {
    const records = await this.attendanceRecordsService.findByUser(userId);
    const sessionIds = records.map((r) => r.sessionId);

    if (sessionIds.length === 0) return [];

    const sessions =
      await this.attendanceSessionRepository.findByIds(sessionIds);

    return sessions.map((session) => this.withComputedStatus(session));
  }

  async findByCreator(createdBy: number): Promise<AttendanceSession[]> {
    const sessions =
      await this.attendanceSessionRepository.findByCreator(createdBy);

    return sessions.map((session) => this.withComputedStatus(session));
  }

  private async reschedule(
    name: 'init-roster' | 'flush',
    sessionId: number,
    at: Date,
  ) {
    const jobId = `${name}:${sessionId}`;
    await this.jobScheduler.cancel(jobId);
    await this.jobScheduler.schedule(
      `attendance:${name}`,
      at,
      { sessionId },
      jobId,
    );
  }

  private async initializeRoster(sessionId: number): Promise<void> {
    if (
      (await this.redisService.get(rosterInitializedKeyFor(sessionId))) === '1'
    ) {
      await this.redisService.del(criteriaKeyFor(sessionId));
      await this.scheduleFlushIfClosed(sessionId);
      return;
    }
    const rawCriteria = await this.redisService.get(criteriaKeyFor(sessionId));

    if (!rawCriteria) {
      throw new Error(
        `Init roster session ${sessionId}: không tìm thấy criteria trong Redis`,
      );
    }

    const criteria: unknown = JSON.parse(rawCriteria);

    if (!isValidUserFilterCriteria(criteria)) {
      throw new Error(
        `Init roster session ${sessionId}: criteria trong Redis không hợp lệ`,
      );
    }

    const userIds = await this.userFilterService.resolveUserIds(criteria);

    await this.attendanceRecordsService.initializeForSession(
      sessionId,
      userIds,
    );
    await this.redisService.set(rosterInitializedKeyFor(sessionId), '1');
    await this.redisService.del(criteriaKeyFor(sessionId));
    await this.scheduleFlushIfClosed(sessionId);
  }

  private async scheduleFlushIfClosed(sessionId: number): Promise<void> {
    const session = await this.findById(sessionId);
    if (session.status === 'closed') {
      const flushAt = new Date(
        Math.max(
          Date.now(),
          session.closeAt.getTime() + REVIEW_RESOLUTION_WINDOW_MS,
        ),
      );
      await this.jobScheduler.schedule(
        'attendance:flush',
        flushAt,
        { sessionId },
        `flush:${sessionId}`,
      );
    }
  }

  private withComputedStatus(session: AttendanceSession): AttendanceSession {
    // 'cancelled' là stored state (sự kiện rời rạc do giảng viên set), phải
    // kiểm tra và giữ nguyên TRƯỚC khi tính theo giờ — nếu không, session đã
    // huỷ nhưng qua closeAt sẽ bị tính đè thành 'closed', mất thông tin huỷ.
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

    return {
      ...session,
      status,
    };
  }
}
