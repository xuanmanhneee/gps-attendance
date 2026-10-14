import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    actorUserId?: number;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    requestId?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          requestId: input.requestId,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Unable to persist audit log for ${input.entityType}:${input.entityId ?? 'unknown'}: ${(error as Error).message}`,
      );
    }
  }
}
