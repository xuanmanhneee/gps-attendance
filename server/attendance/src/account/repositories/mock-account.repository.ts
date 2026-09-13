import { Injectable } from '@nestjs/common';
import { Account } from '../account.model';
import { IAccountRepository } from '../account.repository';
import { MOCK_ACCOUNTS } from '../mocks/accounts.mock';

@Injectable()
export class MockAccountRepository implements IAccountRepository {
  private accounts: Account[] = [...MOCK_ACCOUNTS];

  async findByUsername(username: string): Promise<Account | undefined> {
    return this.accounts.find((a) => a.username === username);
  }

  async findById(id: number): Promise<Account | undefined> {
    return this.accounts.find((a) => a.id === id);
  }
}
