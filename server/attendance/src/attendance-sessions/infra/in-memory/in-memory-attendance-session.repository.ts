import { Injectable } from '@nestjs/common';
import {
  AttendanceSession,
  CreateAttendanceSessionRecord,
  UpdateAttendanceSessionRecord,
} from '../../attendance-session.model';
import { IAttendanceSessionRepository } from '../../attendance-session.repository';

@Injectable()
export class InMemoryAttendanceSessionRepository implements IAttendanceSessionRepository {
  private sessions = new Map<number, AttendanceSession>();
  private nextId = 1;

  async create(
    input: CreateAttendanceSessionRecord,
  ): Promise<AttendanceSession> {
    const now = new Date();
    const session: AttendanceSession = {
      id: this.nextId++,
      ...input,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async update(
    id: number,
    data: UpdateAttendanceSessionRecord,
  ): Promise<AttendanceSession> {
    const current = this.sessions.get(id);

    if (!current) {
      throw new Error(`AttendanceSession ${id} not found`);
    }

    // Bỏ các trường undefined để hành vi giống Prisma (PATCH một phần)
    const defined = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    const updated: AttendanceSession = {
      ...current,
      ...defined,
      updatedAt: new Date(),
    };
    this.sessions.set(id, updated);
    return updated;
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
