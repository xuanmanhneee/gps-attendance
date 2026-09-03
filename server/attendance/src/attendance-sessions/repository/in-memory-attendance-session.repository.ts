import { Injectable } from '@nestjs/common';
import {
  AttendanceSession,
  CreateAttendanceSessionRecord,
} from '../attendance-session.model';
import { IAttendanceSessionRepository } from '../attendance-session.repository';

@Injectable()
export class InMemoryAttendanceSessionRepository implements IAttendanceSessionRepository {
  private sessions = new Map<number, AttendanceSession>();
  private nextId = 1;

  async create(
    input: CreateAttendanceSessionRecord,
  ): Promise<AttendanceSession> {
    const session: AttendanceSession = {
      id: this.nextId++,
      ...input,
      status: 'pending',
    };

    this.sessions.set(session.id, session);

    return session;
  }

  getAll(): Promise<AttendanceSession[]> {
    return Promise.resolve([...this.sessions.values()]);
  }

  getById(id: number): Promise<AttendanceSession | null> {
    return Promise.resolve(this.sessions.get(id) ?? null);
  }
}
