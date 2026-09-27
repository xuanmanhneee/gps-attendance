import {
  ForbiddenException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceSessionErrorCode, SessionStatus } from '@gps-attendance/shared';

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
    const openAt = new Date(dto.openAt);
    const closeAt = new Date(dto.closeAt);
    if (closeAt <= openAt) {
      throw new BadRequestException({
        code: AttendanceSessionErrorCode.INVALID_TIME_RANGE,
        message: 'Thời gian đóng session phải sau thời gian mở',
      });
    }

    const userIds = await this.userFilterService.resolveUserIds(
      dto.participantCriteria,
    );
    const now = new Date();
    const session = await this.attendanceSessionRepository.createWithRecords({
      title: dto.title,
      latitude: dto.latitude,
      longitude: dto.longitude,
      radius: dto.radius,
      openAt,
      closeAt,
      createdBy,
      createdAt: now,
      updatedAt: now,
    }, userIds);

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

    await this.attendanceSessionRepository.delete(id);
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
    return this.withComputedStatus(updated);
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
