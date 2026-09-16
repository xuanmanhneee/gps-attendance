import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import type { Account } from '../../account.model';
import type { IAccountRepository } from '../../account.repository';
import { mockAccounts } from '#common/mock-data/accounts.mock';

export class InMemoryAccountRepository implements IAccountRepository {
  private accounts = [...mockAccounts];

  async findById(
    id: number,
    _ctx?: ITransactionContext,
  ): Promise<Account | undefined> {
    return this.accounts.find((account) => account.id === id);
  }

  async findByUsername(
    username: string,
    _ctx?: ITransactionContext,
  ): Promise<Account | undefined> {
    return this.accounts.find((account) => account.username === username);
  }

  async findByUserId(
    userId: number,
    _ctx?: ITransactionContext,
  ): Promise<Account | undefined> {
    return this.accounts.find((account) => account.userId === userId);
  }

  async create(
    data: {
      userId: number;
      username: string;
      passwordHash: string;
    },
    _ctx?: ITransactionContext,
  ): Promise<Account> {
    const now = new Date();

    const account: Account = {
      id: this.accounts.length + 1,
      ...data,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.accounts.push(account);

    return account;
  }
}
