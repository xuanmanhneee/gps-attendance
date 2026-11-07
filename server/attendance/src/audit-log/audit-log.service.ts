import { Inject, Injectable } from '@nestjs/common';
import type { AuditEntry } from './audit-log.model';
import type { IAuditLogRepository } from './audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from './audit-log.repository.token';

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  record(entry: AuditEntry): Promise<void> {
    return this.auditLogRepository.create({
      ...entry,
      reason: entry.reason?.slice(0, 500),
    });
  }
}
