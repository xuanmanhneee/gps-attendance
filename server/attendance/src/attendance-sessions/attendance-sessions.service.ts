import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceSession, SessionStatus } from './attendance-session.model';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';

@Injectable()
export class AttendanceSessionsService {
  private sessions: AttendanceSession[] = [];
  private nextId = 1;

  constructor(){
    this.create(
      {
        title: 'Test Attendance Session',
        latitude: 11.9404,
        longitude: 108.4583,
        radius: 100,
        openAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        closeAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      1,
    );
  }

  create(dto: CreateAttendanceSessionDto, createdBy: number): AttendanceSession {
    const now = new Date();

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
    return this.withComputedStatus(session);
  }

  findAll(): AttendanceSession[] {
    return this.sessions.map((s) => this.withComputedStatus(s));
  }

  findById(id: number): AttendanceSession {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) {
      throw new NotFoundException(`Không tìm thấy session id=${id}`);
    }
    return this.withComputedStatus(session);
  }

  /**
   * status thực tế tính động theo thời gian hiện tại so với openAt/closeAt,
   * không lưu cứng trong data — tránh phải chạy cron job cập nhật status định kỳ.
   */
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