// src/common/unit-of-work/prisma-unit-of-work.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#prisma/prisma.service';
import type {
  IUnitOfWork,
  ITransactionContext,
} from './unit-of-work.interface';
import { PrismaTransactionContext } from './prisma-transaction-context';

@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async runInTransaction<T>(
    work: (ctx: ITransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((tx) =>
      work(new PrismaTransactionContext(tx)),
    );
  }
}
