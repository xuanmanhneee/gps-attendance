import { AttendanceSession } from './attendance-session.model';
import { CreateAttendanceSessionRecord } from './attendance-session.model';

export interface IAttendanceSessionRepository {
  create(input: CreateAttendanceSessionRecord): Promise<AttendanceSession>;

  findAll(): Promise<AttendanceSession[]>;
  findById(id: number): Promise<AttendanceSession | null>;
  findByIds(ids: number[]): Promise<AttendanceSession[]>;
  findByCreator(createdBy: number): Promise<AttendanceSession[]>;
}
