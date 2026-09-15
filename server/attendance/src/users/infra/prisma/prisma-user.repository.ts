// src/users/infra/prisma/user.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#prisma/prisma.service';
import type { IUserRepository } from '../../user.repository';
import type { User, CreateUserInput } from '../../user.model';
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import { PrismaTransactionContext } from '#common/unit-of-work/prisma-transaction-context';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(ctx?: ITransactionContext) {
    return ctx instanceof PrismaTransactionContext ? ctx.tx : this.prisma;
  }

  async findById(id: number): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ?? undefined;
  }

  async findByIds(ids: number[]): Promise<User[]> {
    return this.prisma.user.findMany({ where: { id: { in: ids } } });
  }

  async findByCode(code: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { code } });
    return user ?? undefined;
  }

  async findByAccountId(accountId: number): Promise<User | undefined> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });
    return account?.user ?? undefined;
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async create(
    data: CreateUserInput,
    ctx?: ITransactionContext,
  ): Promise<User> {
    console.log('[DEBUG] creating user with data:', data);
    return this.client(ctx).user.create({ data });
  }
}
