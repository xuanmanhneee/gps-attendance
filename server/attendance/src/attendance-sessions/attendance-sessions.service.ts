import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus } from '@gps-attendance/shared';

import { IJobScheduler } from '#job-scheduler/job-scheduler.interface';
import { JOB_SCHEDULER } from '#job-scheduler/job-scheduler.token';

import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { ILogger } from '../common/logging/logger.interface';
import { ILoggerFactory } from '../common/logging/logger.factory';
import { LOGGER_FACTORY } from '../common/logging/logger.token';
import { UserFilterService } from '../users/user-filter.service';

import { AttendanceSession } from './attendance-session.model';
import { IAttendanceSessionRepository } from './attendance-session.repository';
import { ATTENDANCE_SESSION_REPOSITORY } from './attendance-session.token';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';

@Injectable()
export class AttendanceSessionsService {
  private readonly logger: ILogger;
  private static readonly ROSTER_INIT_BUFFER_MS = 5 * 60 * 1000;

  constructor(
    @Inject(ATTENDANCE_SESSION_REPOSITORY)
    private readonly attendanceSessionRepository: IAttendanceSessionRepository,
    private readonly userFilterService: UserFilterService,
    private readonly attendanceRecordsService: AttendanceRecordsService,

    @Inject(JOB_SCHEDULER)
    private readonly jobScheduler: IJobScheduler,

    @Inject(LOGGER_FACTORY)
    loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory.create(AttendanceSessionsService.name);
  }

  onModuleInit() {
    this.jobScheduler.onJob<{ sessionId: number; userIds: number[] }>(
      'attendance:init-roster',
      (payload) =>
        this.attendanceRecordsService.initializeForSession(
          payload.sessionId,
          payload.userIds,
        ),
    );
  }

  async create(
    dto: CreateAttendanceSessionDto,
    createdBy: number,
  ): Promise<AttendanceSession> {
    const now = new Date();

    const userIds = await this.userFilterService.resolveUserIds(
      dto.participantCriteria,
    );

    const session = await this.attendanceSessionRepository.create({
      title: dto.title,
      latitude: dto.latitude,
      longitude: dto.longitude,
      radius: dto.radius,
      openAt: new Date(dto.openAt),
      closeAt: new Date(dto.closeAt),
      createdBy,
      createdAt: now,
      updatedAt: now,
    });

    const initAt = new Date(
      session.openAt.getTime() -
        AttendanceSessionsService.ROSTER_INIT_BUFFER_MS,
    );

    await this.jobScheduler.schedule(
      'attendance:init-roster',
      initAt,
      { sessionId: session.id, userIds },
      `init-roster:${session.id}`,
    );
    await this.jobScheduler.schedule(
      'attendance:flush',
      session.closeAt,
      { sessionId: session.id },
      `flush:${session.id}`,
    );

    return this.withComputedStatus(session);
  }

  // Huỷ session — chỉ cho phép khi chưa đóng (pending hoặc open), chưa từng
  // bị huỷ trước đó. Nếu đang open, dọn luôn buffer để không lẫn dữ liệu
  // check-in dở dang vào lần flush kế (dù job flush đã bị cancel, phòng
  // trường hợp job đã trót chạy trước khi cancel kịp tới nơi).
  async cancel(sessionId: number): Promise<AttendanceSession> {
    const session = await this.findById(sessionId);

    if (session.status === 'closed' || session.status === 'cancelled') {
      throw new ConflictException(
        `Không thể huỷ session ${sessionId} vì đang ở trạng thái "${session.status}"`,
      );
    }

    const wasOpen = session.status === 'open';

    await this.attendanceSessionRepository.updateStatus(
      sessionId,
      'cancelled',
    );

    await this.jobScheduler.cancel(`init-roster:${sessionId}`);
    await this.jobScheduler.cancel(`flush:${sessionId}`);

    if (wasOpen) {
      await this.attendanceRecordsService.clearSessionBuffer(sessionId);
    }

    return { ...session, status: 'cancelled' };
  }

  async findAll(): Promise<AttendanceSession[]> {
    const sessions = await this.attendanceSessionRepository.findAll();

    return sessions.map((session) => this.withComputedStatus(session));
  }

  async findById(id: number): Promise<AttendanceSession> {
    const session = await this.attendanceSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException(`Không tìm thấy session id=${id}`);
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