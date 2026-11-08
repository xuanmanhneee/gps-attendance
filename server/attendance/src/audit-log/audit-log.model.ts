export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: number | null;
  reason?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}

export interface AuditLogRecord extends AuditEntry {
  id: string;
  createdAt: Date;
}

export interface AuditLogQuery {
  actorId: number;
  entityType: string;
  action: string;
}
