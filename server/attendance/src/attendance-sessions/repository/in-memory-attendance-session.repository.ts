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

  async findAll(): Promise<AttendanceSession[]> {
    return [...this.sessions.values()];
  }

  async findById(id: number): Promise<AttendanceSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async findByIds(ids: number[]): Promise<AttendanceSession[]> {
    const idSet = new Set(ids);
    return [...this.sessions.values()].filter((s) => idSet.has(s.id));
  }

  async findByCreator(createdBy: number): Promise<AttendanceSession[]> {
    return [...this.sessions.values()].filter(
      (session) => session.createdBy === createdBy,
    );
  }
}
