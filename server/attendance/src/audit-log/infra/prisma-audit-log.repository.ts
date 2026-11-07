import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import type { AuditEntry } from '../audit-log.model';
import type { IAuditLogRepository } from '../audit-log.repository';

@Injectable()
export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: AuditEntry): Promise<void> {
    const metadata: Prisma.InputJsonObject = {
      ...(entry.reason === undefined ? {} : { reason: entry.reason }),
      ...(entry.oldValue === undefined
        ? {}
        : { oldValue: entry.oldValue as Prisma.InputJsonValue }),
      ...(entry.newValue === undefined
        ? {}
        : { newValue: entry.newValue as Prisma.InputJsonValue }),
      ...(entry.metadata === undefined
        ? {}
        : { metadata: entry.metadata as Prisma.InputJsonValue }),
    };

    await this.prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorUserId: entry.actorId,
        metadata,
      },
    });
  }
}
