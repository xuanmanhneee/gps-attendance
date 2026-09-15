import type { User, CreateUserInput } from './user.model';
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';


export interface IUserRepository {
  findById(id: number): Promise<User | undefined>;
  findByIds(ids: number[]): Promise<User[]>;
  findByCode(code: string): Promise<User | undefined>;
  findByAccountId(accountId: number): Promise<User | undefined>;
  findAll(): Promise<User[]>;
  create(data: CreateUserInput, ctx?: ITransactionContext): Promise<User>;
}
