import { Injectable } from '@nestjs/common';
import { ITransactionContext, IUnitOfWork } from './unit-of-work.interface';

@Injectable()
export class InMemoryUnitOfWork implements IUnitOfWork {
  async runInTransaction<T>(
    work: (ctx: ITransactionContext) => Promise<T>,
  ): Promise<T> {
    return work({});
  }
}
