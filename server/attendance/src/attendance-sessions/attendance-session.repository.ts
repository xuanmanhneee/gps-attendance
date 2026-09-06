import { AttendanceSession } from './attendance-session.model';
import { CreateAttendanceSessionRecord } from './attendance-session.model';

export interface IAttendanceSessionRepository {
  create(input: CreateAttendanceSessionRecord): Promise<AttendanceSession>;

  getAll(): Promise<AttendanceSession[]>;
  getById(id: number): Promise<AttendanceSession | null>;
  getByIds(ids: number[]): Promise<AttendanceSession[]>;
  findByCreator(createdBy: number): Promise<AttendanceSession[]>;
}
