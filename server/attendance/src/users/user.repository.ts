import type { User } from './user.model';
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import { CreateUserDto } from './dto/create-user.dto';

export interface IUserRepository {
  findById(id: number, ctx?: ITransactionContext): Promise<User | undefined>;

  findByIds(ids: number[], ctx?: ITransactionContext): Promise<User[]>;

  findByCodes(codes: string[], ctx?: ITransactionContext): Promise<User[]>;

  findByCode(
    code: string,
    ctx?: ITransactionContext,
  ): Promise<User | undefined>;

  findByAccountId(
    accountId: number,
    ctx?: ITransactionContext,
  ): Promise<User | undefined>;

  findByUnitIds(unitIds: number[]): Promise<User[]>;

  findAll(ctx?: ITransactionContext): Promise<User[]>;

  create(data: CreateUserDto, ctx?: ITransactionContext): Promise<User>;

  update(
    id: number,
    data: Partial<Pick<User, 'fullname' | 'role' | 'unitId'>>,
    ctx?: ITransactionContext,
  ): Promise<User>;
}
