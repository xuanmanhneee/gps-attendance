// prisma-unit.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#prisma/prisma.service';
import { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import { PrismaTransactionContext } from '#common/unit-of-work/prisma-transaction-context';
import IUnitRepository from '../../unit.repository';
import { Unit } from '../../unit.model';

@Injectable()
export class PrismaUnitRepository implements IUnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy đúng client (tx nếu đang trong transaction, prisma gốc nếu không) */
  private client(ctx?: ITransactionContext) {
    if (ctx instanceof PrismaTransactionContext) {
      return ctx.tx;
    }
    return this.prisma;
  }

  findById(id: number, ctx?: ITransactionContext): Promise<Unit | null> {
    return this.client(ctx).unit.findUnique({ where: { id } });
  }

  findByIds(ids: number[], ctx?: ITransactionContext): Promise<Unit[]> {
    return this.client(ctx).unit.findMany({ where: { id: { in: ids } } });
  }

  findAll(ctx?: ITransactionContext): Promise<Unit[]> {
    return this.client(ctx).unit.findMany();
  }

  create(
    data: { name: string; parentId: number | null; level: number },
    ctx?: ITransactionContext,
  ): Promise<Unit> {
    return this.client(ctx).unit.create({ data });
  }

  update(
    id: number,
    data: { name?: string; parentId?: number | null; level?: number },
    ctx?: ITransactionContext,
  ): Promise<Unit> {
    return this.client(ctx).unit.update({ where: { id }, data });
  }

  delete(id: number, ctx?: ITransactionContext): Promise<void> {
    return this.client(ctx).unit.delete({ where: { id } }).then(() => undefined);
  }
}