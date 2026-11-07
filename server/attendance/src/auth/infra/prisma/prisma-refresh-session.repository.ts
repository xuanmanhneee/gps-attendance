import { Injectable } from '@nestjs/common';
import { PrismaService } from '#prisma/prisma.service';
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import { PrismaTransactionContext } from '#common/unit-of-work/prisma-transaction-context';
import type { IRefreshSessionRepository } from '../../refresh-session.repository';

@Injectable()
export class PrismaRefreshSessionRepository implements IRefreshSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(ctx: ITransactionContext) {
    if (!(ctx instanceof PrismaTransactionContext)) {
      throw new Error('Refresh token rotation requires a Prisma transaction');
    }
    return ctx.tx;
  }

  async create(
    accountId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.refreshSession.create({
      data: { accountId, tokenHash, expiresAt },
    });
  }

  async rotate(
    currentHash: string,
    nextHash: string,
    nextExpiresAt: Date,
    ctx: ITransactionContext,
  ): Promise<number | undefined> {
    const tx = this.client(ctx);
    const current = await tx.refreshSession.findUnique({
      where: { tokenHash: currentHash },
    });
    if (!current) return undefined;

    const result = await tx.refreshSession.updateMany({
      where: {
        id: current.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) return undefined;

    await tx.refreshSession.create({
      data: {
        accountId: current.accountId,
        tokenHash: nextHash,
        expiresAt: nextExpiresAt,
      },
    });
    return current.accountId;
  }
}
