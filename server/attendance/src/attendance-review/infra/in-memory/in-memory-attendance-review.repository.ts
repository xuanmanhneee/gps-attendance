import { Injectable } from '@nestjs/common';

import type { AttendanceReviewCandidate } from '../../attendance-review.model';
import type { IAttendanceReviewRepository } from '../../attendance-review.repository';

@Injectable()
export class InMemoryAttendanceReviewRepository implements IAttendanceReviewRepository {
  private readonly candidatesBySession = new Map<
    number,
    Map<number, AttendanceReviewCandidate>
  >();

  async upsert(
    candidate: AttendanceReviewCandidate,
    _expiresAt: Date,
  ): Promise<void> {
    let candidates = this.candidatesBySession.get(candidate.sessionId);

    if (!candidates) {
      candidates = new Map();
      this.candidatesBySession.set(candidate.sessionId, candidates);
    }

    candidates.set(candidate.userId, this.clone(candidate));
  }

  async find(
    sessionId: number,
    userId: number,
  ): Promise<AttendanceReviewCandidate | null> {
    const candidate = this.candidatesBySession.get(sessionId)?.get(userId);
    return candidate ? this.clone(candidate) : null;
  }

  async findBySession(sessionId: number): Promise<AttendanceReviewCandidate[]> {
    return [...(this.candidatesBySession.get(sessionId)?.values() ?? [])].map(
      (candidate) => this.clone(candidate),
    );
  }

  async updateSessionExpiry(): Promise<void> {}

  async delete(sessionId: number, userId: number): Promise<void> {
    this.candidatesBySession.get(sessionId)?.delete(userId);
  }

  async clearSession(sessionId: number): Promise<void> {
    this.candidatesBySession.delete(sessionId);
  }

  private clone(candidate: AttendanceReviewCandidate) {
    return {
      ...candidate,
      reasons: [...candidate.reasons],
      createdAt: new Date(candidate.createdAt),
    };
  }
}
