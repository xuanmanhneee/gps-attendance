import { Injectable } from '@nestjs/common';
import { Prisma } from '#prisma/generated/client';
import { PrismaService } from '#prisma/prisma.service';
import type { AuditEntry } from '../audit-log.model';
import type { IAuditLogRepository } from '../audit-log.repository';

@Injectable()
export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorId: entry.actorId,
        reason: entry.reason,
        oldValue: entry.oldValue as Prisma.InputJsonValue | undefined,
        newValue: entry.newValue as Prisma.InputJsonValue | undefined,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
