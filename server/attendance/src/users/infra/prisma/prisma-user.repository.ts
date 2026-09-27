// src/users/infra/prisma/user.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#prisma/prisma.service';
import type { IUserRepository } from '../../user.repository';
import type { User } from '../../user.model';
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import { PrismaTransactionContext } from '#common/unit-of-work/prisma-transaction-context';
import { CreateUserDto } from '#user/dto/create-user.dto';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(ctx?: ITransactionContext) {
    return ctx instanceof PrismaTransactionContext ? ctx.tx : this.prisma;
  }

  async findById(
    id: number,
    ctx?: ITransactionContext,
  ): Promise<User | undefined> {
    const user = await this.client(ctx).user.findUnique({
      where: { id },
    });

    return user ?? undefined;
  }

  async findByIds(ids: number[], ctx?: ITransactionContext): Promise<User[]> {
    return this.client(ctx).user.findMany({
      where: { id: { in: ids } },
    });
  }

  async findByCode(
    code: string,
    ctx?: ITransactionContext,
  ): Promise<User | undefined> {
    const user = await this.client(ctx).user.findUnique({
      where: { code },
    });

    return user ?? undefined;
  }

  async findByAccountId(
    accountId: number,
    ctx?: ITransactionContext,
  ): Promise<User | undefined> {
    const account = await this.client(ctx).account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    return account?.user ?? undefined;
  }

  async findByUnitIds(unitIds: number[]): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        unitId: {
          in: unitIds,
        },
      },
    });
  }

  async findAll(ctx?: ITransactionContext): Promise<User[]> {
    return this.client(ctx).user.findMany();
  }

  async create(data: CreateUserDto, ctx?: ITransactionContext): Promise<User> {
    return this.client(ctx).user.create({ data });
  }
}
