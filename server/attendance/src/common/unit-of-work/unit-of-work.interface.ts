// src/common/unit-of-work/unit-of-work.interface.ts
export interface ITransactionContext {}

export interface IUnitOfWork {
  runInTransaction<T>(
    work: (ctx: ITransactionContext) => Promise<T>,
  ): Promise<T>;
}
