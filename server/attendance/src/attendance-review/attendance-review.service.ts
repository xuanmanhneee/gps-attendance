import { Inject, Injectable } from '@nestjs/common';

import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import type {
  RequestAttendanceReviewInput,
  RequestAttendanceReviewResult,
  AttendanceReviewHistoryEntry,
  ResolveAttendanceReviewResult,
} from './attendance-review.model';
import type { IAttendanceReviewHistoryRepository } from './attendance-review-history.repository';
import { ATTENDANCE_REVIEW_HISTORY_REPOSITORY } from './attendance-review-history.repository.token';
import type { IAttendanceReviewRepository } from './attendance-review.repository';
import { ATTENDANCE_REVIEW_REPOSITORY } from './attendance-review.repository.token';

@Injectable()
export class AttendanceReviewService {
  constructor(
    @Inject(ATTENDANCE_REVIEW_REPOSITORY)
    private readonly attendanceReviewRepository: IAttendanceReviewRepository,
    @Inject(ATTENDANCE_REVIEW_HISTORY_REPOSITORY)
    private readonly attendanceReviewHistoryRepository: IAttendanceReviewHistoryRepository,
    private readonly attendanceRecordsService: AttendanceRecordsService,
  ) {}

  async requestReview(
    input: RequestAttendanceReviewInput,
  ): Promise<RequestAttendanceReviewResult> {
    const before = await this.attendanceRecordsService.getBySessionAndUser(
      input.sessionId,
      input.userId,
    );
    const beforeFailure = this.getRequestFailure(before);
    if (beforeFailure) return beforeFailure;

    await this.attendanceReviewRepository.upsert(
      {
        sessionId: input.sessionId,
        userId: input.userId,
        reasons: [...input.reasons],
        createdAt: input.createdAt,
      },
      input.expiresAt,
    );

    // Re-read sau khi ghi để tự dọn candidate nếu một check-in VALID hoặc
    // quyết định khác đã khóa record trong lúc request review đang chạy.
    const after = await this.attendanceRecordsService.getBySessionAndUser(
      input.sessionId,
      input.userId,
    );
    const afterFailure = this.getRequestFailure(after);
    if (afterFailure) {
      await this.attendanceReviewRepository.delete(
        input.sessionId,
        input.userId,
      );
      return afterFailure;
    }

    return 'requested';
  }

  findBySession(sessionId: number) {
    return this.attendanceReviewRepository.findBySession(sessionId);
  }

  async removeCandidate(sessionId: number, userId: number): Promise<void> {
    await this.attendanceReviewRepository.delete(sessionId, userId);
  }

  async updateSessionExpiry(sessionId: number, expiresAt: Date): Promise<void> {
    await this.attendanceReviewRepository.updateSessionExpiry(
      sessionId,
      expiresAt,
    );
  }

  async clearSession(sessionId: number): Promise<void> {
    await this.attendanceReviewRepository.clearSession(sessionId);
  }

  recordHistory(entry: AttendanceReviewHistoryEntry): Promise<void> {
    return this.attendanceReviewHistoryRepository.record(entry);
  }

  findHistoryByResolver(resolverId: number) {
    return this.attendanceReviewHistoryRepository.findByResolver(resolverId);
  }

  async resolveReview(
    sessionId: number,
    userId: number,
    decision: 'approve' | 'reject',
    resolverId: number,
  ): Promise<ResolveAttendanceReviewResult> {
    const candidate = await this.attendanceReviewRepository.find(
      sessionId,
      userId,
    );
    if (!candidate) return { status: 'not-requested' };

    const result = await this.attendanceRecordsService.resolveReviewRecord(
      sessionId,
      userId,
      decision,
      resolverId,
      candidate.createdAt,
    );
    if (result.status !== 'resolved') return result;

    try {
      await this.attendanceReviewRepository.delete(sessionId, userId);
    } catch {
      // Record đã resolve; candidate chỉ là dữ liệu tạm và sẽ tự hết hạn.
    }

    return {
      ...result,
      candidate,
    };
  }

  private getRequestFailure(
    record: Awaited<
      ReturnType<AttendanceRecordsService['getBySessionAndUser']>
    >,
  ): Exclude<RequestAttendanceReviewResult, 'requested'> | null {
    if (!record) return 'record-missing';
    if (record.status === 'present') return 'already-present';
    if (record.status !== 'absent' || record.updateBy !== null) return 'locked';

    return null;
  }
}
