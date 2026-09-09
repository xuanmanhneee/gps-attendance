import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { AttendanceSession, SessionStatus } from './attendance-session.model';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { UserFilterService } from '../users/user-filter.service';

import { LOGGER_FACTORY } from '../common/logging/logger.token';
import { ILogger } from '../common/logging/logger.interface';
import { ILoggerFactory } from '../common/logging/logger.factory';
import { IAttendanceRecordStore } from '../attendance-record/attendance-record.store';
import { ATTENDANCE_RECORD_STORE } from '../attendance-record/attendance-record.token';

@Injectable()
export class AttendanceSessionsService {
  private readonly logger: ILogger;

  private sessions: AttendanceSession[] = [];
  private nextId = 1;

  constructor(
    private readonly userFilterService: UserFilterService,

    @Inject(ATTENDANCE_RECORD_STORE)
    private readonly attendanceRecordStore: IAttendanceRecordStore,

    @Inject(LOGGER_FACTORY)
    loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory.create(AttendanceSessionsService.name);

    this.create(
      {
        title: 'Test Attendance Session',
        latitude: 11.9404,
        longitude: 108.4583,
        radius: 100,
        openAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        closeAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),

        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312716', '2312718'],
          },
        },
      },
      1,
    );
  }

  async create(
    dto: CreateAttendanceSessionDto,
    createdBy: number,
  ): Promise<AttendanceSession> {
    const now = new Date();

    const userIds = this.userFilterService.resolveUserIds(dto.participantCriteria);

    const session: AttendanceSession = {
      id: this.nextId++,
      title: dto.title,
      latitude: dto.latitude,
      longitude: dto.longitude,
      radius: dto.radius,
      openAt: new Date(dto.openAt),
      closeAt: new Date(dto.closeAt),
      status: 'pending',
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.push(session);

    for (const userId of userIds) {
      await this.attendanceRecordStore.upsertRecord({
        sessionId: session.id,
        userId,
        status: 'absent',
        deviceId: null,
        checkedInAt: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        distanceMeters: null,
      });
    }

    return this.withComputedStatus(session);
  }

  findAll(): AttendanceSession[] {
    return this.sessions.map((session) => this.withComputedStatus(session));
  }

  findById(id: number): AttendanceSession {
    const session = this.sessions.find((session) => session.id === id);

    if (!session) {
      throw new NotFoundException(`Không tìm thấy session id=${id}`);
    }

    return this.withComputedStatus(session);
  }

  /**
   * Status thực tế được tính động theo thời gian hiện tại
   * so với openAt/closeAt.
   *
   * Không lưu cứng status trong data để tránh phải
   * chạy cron job cập nhật status định kỳ.
   */
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
