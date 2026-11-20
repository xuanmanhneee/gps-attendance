import type { IAttendanceReviewHistoryRepository } from '../../attendance-review-history.repository';
import type {
  AttendanceReviewHistoryEntry,
  AttendanceReviewHistoryRecord,
} from '../../attendance-review.model';

export class InMemoryAttendanceReviewHistoryRepository implements IAttendanceReviewHistoryRepository {
  private sequence = 0;
  private readonly records: AttendanceReviewHistoryRecord[] = [];

  async record(entry: AttendanceReviewHistoryEntry): Promise<void> {
    this.records.unshift({
      ...entry,
      id: String(++this.sequence),
      reasons: [...entry.reasons],
      resolvedAt: new Date(),
    });
  }

  async findByResolver(
    resolverId: number,
  ): Promise<AttendanceReviewHistoryRecord[]> {
    return this.records
      .filter((record) => record.resolverId === resolverId)
      .map((record) => ({
        ...record,
        reasons: [...record.reasons],
        resolvedAt: new Date(record.resolvedAt),
      }));
  }
}
