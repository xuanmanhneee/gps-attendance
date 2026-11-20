import type {
  AttendanceReviewHistoryEntry,
  AttendanceReviewHistoryRecord,
} from './attendance-review.model';

export interface IAttendanceReviewHistoryRepository {
  record(entry: AttendanceReviewHistoryEntry): Promise<void>;
  findByResolver(resolverId: number): Promise<AttendanceReviewHistoryRecord[]>;
}
