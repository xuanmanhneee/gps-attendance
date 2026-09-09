import { Injectable } from '@nestjs/common';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { UsersService } from '../users/users.service';
import { AttendanceSession } from './attendance-session.model';
import { AttendanceRecord } from '../attendance-record/attendance-record.model';
import { User } from '../users/user.model';
import { AttendanceSessionDetailResponse } from '@gps-attendance/shared';

@Injectable()
export class AttendanceSessionQueryService {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly usersService: UsersService,
  ) {}

  async getDetail(
    sessionId: number,
  ): Promise<AttendanceSessionDetailResponse> {
    const session =
      await this.attendanceSessionsService.findById(sessionId);

    const records =
      await this.attendanceRecordsService.findBySessionId(sessionId);

    const users = await this.usersService.findByIds(
      records.map(record => record.userId),
    );

    return this.toDetail(session, records, users);
  }

  private toDetail(
    session: AttendanceSession,
    records: AttendanceRecord[],
    users: User[],
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
    };
  }
}