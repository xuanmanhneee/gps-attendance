import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { AttendanceSession, SessionStatus } from './attendance-session.model';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { UserFilterService } from '../users/user-filter.service';

import { LOGGER_FACTORY } from '../common/logging/logger.token';
import { ILogger } from '../common/logging/logger.interface';
import { ILoggerFactory } from '../common/logging/logger.factory';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { IAttendanceSessionRepository } from './attendance-session.repository';
import { ATTENDANCE_SESSION_REPOSITORY } from './attendance-session.token';

@Injectable()
export class AttendanceSessionsService {
  private readonly logger: ILogger;
  
  constructor(
    @Inject(ATTENDANCE_SESSION_REPOSITORY)
    private readonly sessionRepo: IAttendanceSessionRepository,
    private readonly filterService: UserFilterService,
    private readonly recordService: AttendanceRecordsService,

    @Inject(LOGGER_FACTORY)
    loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory.create(AttendanceSessionsService.name);
  }

  async create(
    dto: CreateAttendanceSessionDto,
    createdBy: number,
  ): Promise<AttendanceSession> {
    const now = new Date();

    const userIds = this.filterService.resolveUserIds(dto.userFilter);

    const session = await this.sessionRepo.create({
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

    await this.recordService.initializeForSession(session.id, userIds);

    return this.withComputedStatus(session);
  }

  async getAll(): Promise<AttendanceSession[]> {
    const sessions = await this.sessionRepo.getAll();

    return sessions.map((session) => this.withComputedStatus(session));
  }

  async getById(id: number): Promise<AttendanceSession> {
    const session = await this.sessionRepo.getById(id);

    if (!session) {
      throw new NotFoundException(`Không tìm thấy session id=${id}`);
    }

    return this.withComputedStatus(session);
  }

  private withComputedStatus(session: AttendanceSession): AttendanceSession {
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
