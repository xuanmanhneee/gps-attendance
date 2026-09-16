import type { User, CreateUserInput } from './user.model';
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';

export interface IUserRepository {
  findById(id: number, ctx?: ITransactionContext): Promise<User | undefined>;

  findByIds(ids: number[], ctx?: ITransactionContext): Promise<User[]>;

  findByCode(
    code: string,
    ctx?: ITransactionContext,
  ): Promise<User | undefined>;

  findByAccountId(
    accountId: number,
    ctx?: ITransactionContext,
  ): Promise<User | undefined>;

  findAll(ctx?: ITransactionContext): Promise<User[]>;

  create(data: CreateUserInput, ctx?: ITransactionContext): Promise<User>;
}
