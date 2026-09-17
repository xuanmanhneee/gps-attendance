import { Injectable } from '@nestjs/common';
import { PrismaService } from '#prisma/prisma.service';
import type { IAccountRepository } from '../../account.repository';
import type { Account, CreateAccountInput } from '../../account.model';
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import { PrismaTransactionContext } from '#common/unit-of-work/prisma-transaction-context';

@Injectable()
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(ctx?: ITransactionContext) {
    return ctx instanceof PrismaTransactionContext ? ctx.tx : this.prisma;
  }

  async findById(
    id: number,
    ctx?: ITransactionContext,
  ): Promise<Account | undefined> {
    const account = await this.client(ctx).account.findUnique({
      where: { id },
    });

    return account ?? undefined;
  }

  async findByUsername(
    username: string,
    ctx?: ITransactionContext,
  ): Promise<Account | undefined> {
    const account = await this.client(ctx).account.findUnique({
      where: { username },
    });

    return account ?? undefined;
  }

  async findByUserId(
    userId: number,
    ctx?: ITransactionContext,
  ): Promise<Account | undefined> {
    const account = await this.client(ctx).account.findUnique({
      where: { userId },
    });

    return account ?? undefined;
  }

  async create(
    data: CreateAccountInput,
    ctx?: ITransactionContext,
  ): Promise<Account> {
    return this.client(ctx).account.create({
      data: {
        userId: data.userId,
        username: data.username,
        passwordHash: data.passwordHash,
      },
    });
  }
}
