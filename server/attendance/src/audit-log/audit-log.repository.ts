import type {
  AuditEntry,
  AuditLogQuery,
  AuditLogRecord,
} from './audit-log.model';

export interface IAuditLogRepository {
  create(entry: AuditEntry): Promise<void>;
  find(query: AuditLogQuery): Promise<AuditLogRecord[]>;
}
