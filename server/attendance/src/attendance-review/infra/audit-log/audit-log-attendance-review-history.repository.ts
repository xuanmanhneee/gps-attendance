import { Injectable } from '@nestjs/common';
import {
  AttendanceReviewDecision,
  AttendanceValidationReason,
  AuditAction,
  AuditEntityType,
} from '@gps-attendance/shared';

import { AuditLogService } from '../../../audit-log/audit-log.service';
import type { IAttendanceReviewHistoryRepository } from '../../attendance-review-history.repository';
import type {
  AttendanceReviewHistoryEntry,
  AttendanceReviewHistoryRecord,
} from '../../attendance-review.model';

const REVIEW_REASONS = new Set<AttendanceValidationReason>([
  'LOW_CONFIDENCE_SCORE',
  'MOCK_LOCATION',
  'OUT_OF_RANGE',
  'INVALID_LOCATION_TIMESTAMP',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseEntityId = (entityId: string) => {
  const match = /^(\d+):(\d+)$/.exec(entityId);
  if (!match) return null;

  const sessionId = Number(match[1]);
  const userId = Number(match[2]);
  return Number.isSafeInteger(sessionId) && Number.isSafeInteger(userId)
    ? { sessionId, userId }
    : null;
};

const parseDecision = (
  metadata: unknown,
  newValue: unknown,
): AttendanceReviewDecision => {
  if (
    isRecord(metadata) &&
    (metadata.decision === 'approve' || metadata.decision === 'reject')
  ) {
    return metadata.decision;
  }

  // Audit cÅ© chÆ°a lÆ°u decision trá»±c tiáº¿p nÃªn cáº§n fallback khi Ä‘á»c.
  return isRecord(newValue) && newValue.status === 'present'
    ? 'approve'
    : 'reject';
};

const parseReasons = (metadata: unknown): AttendanceValidationReason[] =>
  isRecord(metadata) && Array.isArray(metadata.reasons)
    ? metadata.reasons.filter(
        (reason): reason is AttendanceValidationReason =>
          typeof reason === 'string' &&
          REVIEW_REASONS.has(reason as AttendanceValidationReason),
      )
    : [];

const parseStatus = (value: unknown, fallback: 'absent' | 'present') =>
  isRecord(value) &&
  (value.status === 'present' ||
    value.status === 'absent' ||
    value.status === 'late' ||
    value.status === 'excused')
    ? value.status
    : fallback;

@Injectable()
export class AuditLogAttendanceReviewHistoryRepository implements IAttendanceReviewHistoryRepository {
  constructor(private readonly auditLogService: AuditLogService) {}

  record(entry: AttendanceReviewHistoryEntry): Promise<void> {
    return this.auditLogService.record({
      entityType: AuditEntityType.ATTENDANCE_RECORD,
      entityId: `${entry.sessionId}:${entry.userId}`,
      action: AuditAction.REVIEW_RESOLVED,
      actorId: entry.resolverId,
      reason: entry.reason,
      oldValue: { status: entry.previousStatus },
      newValue: { status: entry.resolvedStatus },
      metadata: {
        decision: entry.decision,
        reasons: entry.reasons,
      },
    });
  }

  async findByResolver(
    resolverId: number,
  ): Promise<AttendanceReviewHistoryRecord[]> {
    const logs = await this.auditLogService.find({
      actorId: resolverId,
      entityType: AuditEntityType.ATTENDANCE_RECORD,
      action: AuditAction.REVIEW_RESOLVED,
    });

    return logs.flatMap((log) => {
      const ids = parseEntityId(log.entityId);
      if (!ids) return [];

      return [
        {
          id: log.id,
          ...ids,
          resolverId,
          decision: parseDecision(log.metadata, log.newValue),
          reasons: parseReasons(log.metadata),
          reason: log.reason,
          previousStatus: parseStatus(log.oldValue, 'absent'),
          resolvedStatus: parseStatus(log.newValue, 'absent'),
          resolvedAt: log.createdAt,
        },
      ];
    });
  }
}
