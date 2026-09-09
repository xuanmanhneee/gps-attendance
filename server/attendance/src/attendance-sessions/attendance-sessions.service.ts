import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@gps-attendance/shared';

import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { UserFilterService } from '../users/user-filter.service';
import { AttendanceSession } from './attendance-session.model';
import { IAttendanceSessionRepository } from './attendance-session.repository';
import { ATTENDANCE_SESSION_REPOSITORY } from './attendance-session.token';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';

@Injectable()
export class AttendanceSessionsService {
  constructor(
    @Inject(ATTENDANCE_SESSION_REPOSITORY)
    private readonly attendanceSessionRepository: IAttendanceSessionRepository,
    private readonly userFilterService: UserFilterService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
  ) {}

  async create(
    dto: CreateAttendanceSessionDto,
    createdBy: number,
  ): Promise<AttendanceSession> {
    const userIds = this.userFilterService.resolveUserIds(
      dto.participantCriteria,
    );
    const now = new Date();
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

    await this.attendanceRecordsService.initializeForSession(
      session.id,
      userIds,
    );

    return this.withComputedStatus(session);
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

  async findByUser(userId: number): Promise<AttendanceSession[]> {
    const records = await this.attendanceRecordsService.findByUser(userId);
    const sessionIds = records.map((record) => record.sessionId);
    if (sessionIds.length === 0) return [];

    const sessions = await this.attendanceSessionRepository.findByIds(sessionIds);
    return sessions.map((session) => this.withComputedStatus(session));
  }

  async findByCreator(createdBy: number): Promise<AttendanceSession[]> {
    const sessions = await this.attendanceSessionRepository.findByCreator(
      createdBy,
    );
    return sessions.map((session) => this.withComputedStatus(session));
  }

  private withComputedStatus(session: AttendanceSession): AttendanceSession {
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
