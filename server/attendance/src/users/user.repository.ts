import type { User } from './user.model';

export interface IUserRepository {
  findById(id: number): Promise<User | undefined>;
  findByCode(code: string): Promise<User | undefined>;
  findByAccountId(accountId: number): Promise<User | undefined>;
  findAll(): Promise<User[]>;
}
