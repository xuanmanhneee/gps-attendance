// src/common/unit-of-work/prisma-transaction-context.ts
import type { Prisma } from '@prisma/client';

import type { ITransactionContext } from './unit-of-work.interface';

export class PrismaTransactionContext implements ITransactionContext {
  constructor(public readonly tx: Prisma.TransactionClient) {}
}
