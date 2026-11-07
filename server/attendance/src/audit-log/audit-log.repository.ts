import type { AuditEntry } from './audit-log.model';

export interface IAuditLogRepository {
  create(entry: AuditEntry): Promise<void>;
}
