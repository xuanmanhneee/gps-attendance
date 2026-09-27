<<<<<<< HEAD
import { Account } from './account.model';

export interface IAccountRepository {
  findByUsername(username: string): Promise<Account | undefined>;
  findById(id: number): Promise<Account | undefined>;
=======
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import type { Account } from './account.model';

export interface IAccountRepository {
  findById(id: number, ctx?: ITransactionContext): Promise<Account | undefined>;

  findByUsername(
    username: string,
    ctx?: ITransactionContext,
  ): Promise<Account | undefined>;

  findByUserId(
    userId: number,
    ctx?: ITransactionContext,
  ): Promise<Account | undefined>;

  create(
    data: {
      userId: number;
      username: string;
      passwordHash: string;
    },
    ctx?: ITransactionContext,
  ): Promise<Account>;
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917
}
