import { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import type { Account } from './account.model';

export interface IAccountRepository {
  findById(id: number): Promise<Account | undefined>;
  findByUsername(username: string): Promise<Account | undefined>;
  findByUserId(userId: number): Promise<Account | undefined>;
  create(
    data: { 
      userId: number;
      username: string; 
      passwordHash: string; 
    },
    ctx?: ITransactionContext,
  ): Promise<Account>;
}