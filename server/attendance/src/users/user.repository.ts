import type { User, UserProfileUpdate } from './user.model';
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import { CreateUserDto } from './dto/create-user.dto';

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

  findByUnitIds(unitIds: number[]): Promise<User[]>;

  findAll(ctx?: ITransactionContext): Promise<User[]>;

  updateProfile(id: number, data: UserProfileUpdate): Promise<User | undefined>;

  create(data: CreateUserDto, ctx?: ITransactionContext): Promise<User>;
}
