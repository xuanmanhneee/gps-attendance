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
