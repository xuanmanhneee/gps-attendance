import { Injectable } from '@nestjs/common';

import { PrismaService } from '#prisma/prisma.service';
import type { IntegrationSessionLink as PrismaIntegrationSessionLink } from '#prisma/generated/client';

import type {
  CreateIntegrationSessionLinkInput,
  IntegrationSessionLink,
} from '../../integration-session-link.model';
import type { IIntegrationSessionLinkRepository } from '../../integration-session-link.repository';

@Injectable()
export class PrismaIntegrationSessionLinkRepository implements IIntegrationSessionLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateIntegrationSessionLinkInput,
  ): Promise<IntegrationSessionLink> {
    const record = await this.prisma.integrationSessionLink.create({
      data: input,
    });
    return this.toDomain(record);
  }

  async findByExternalId(
    externalId: string,
  ): Promise<IntegrationSessionLink | null> {
    const record = await this.prisma.integrationSessionLink.findUnique({
      where: { externalId },
    });
    return record ? this.toDomain(record) : null;
  }

  async attachSession(
    linkId: number,
    sessionId: number,
  ): Promise<IntegrationSessionLink> {
    const record = await this.prisma.integrationSessionLink.update({
      where: { id: linkId },
      data: { attendanceSessionId: sessionId },
    });
    return this.toDomain(record);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.integrationSessionLink.delete({ where: { id } });
  }

  private toDomain(
    record: PrismaIntegrationSessionLink,
  ): IntegrationSessionLink {
    return {
      id: record.id,
      externalId: record.externalId,
      requestFingerprint: record.requestFingerprint,
      attendanceSessionId: record.attendanceSessionId,
      createdAt: record.createdAt,
    };
  }
}
