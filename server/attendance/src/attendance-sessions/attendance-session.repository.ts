import { AttendanceSession } from './attendance-session.model';
import { CreateAttendanceSessionRecord } from './attendance-session.model';

export interface IAttendanceSessionRepository {
  create(input: CreateAttendanceSessionRecord): Promise<AttendanceSession>;
  createWithRecords(
    input: CreateAttendanceSessionRecord,
    userIds: number[],
  ): Promise<AttendanceSession>;

  findAll(): Promise<AttendanceSession[]>;
  findById(id: number): Promise<AttendanceSession | null>;
  findByIds(ids: number[]): Promise<AttendanceSession[]>;
  findByCreator(createdBy: number): Promise<AttendanceSession[]>;
  close(id: number): Promise<AttendanceSession>;
  delete(id: number): Promise<void>;
}
