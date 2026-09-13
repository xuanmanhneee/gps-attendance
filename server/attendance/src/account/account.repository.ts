import { Account } from './account.model';

export interface IAccountRepository {
  findByUsername(username: string): Promise<Account | undefined>;
  findById(id: number): Promise<Account | undefined>;
}
