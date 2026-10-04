// src/users/infra/in-memory/in-memory-user.repository.ts
import type { IUserRepository } from '../../user.repository';
import type { User, UserProfileUpdate } from '../../user.model';
import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';
import { mockUsers } from '#common/mock-data/users.mock';
import { mockAccounts } from '#common/mock-data/accounts.mock';
import { CreateUserDto } from '#user/dto/create-user.dto';

export class InMemoryUserRepository implements IUserRepository {
  private users = [...mockUsers];
  private nextId = Math.max(...this.users.map((user) => user.id)) + 1;

  async findById(
    id: number,
    _ctx?: ITransactionContext,
  ): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async findByIds(ids: number[], _ctx?: ITransactionContext): Promise<User[]> {
    const idSet = new Set(ids);

    return this.users.filter((user) => idSet.has(user.id));
  }

  async findByCode(
    code: string,
    _ctx?: ITransactionContext,
  ): Promise<User | undefined> {
    return this.users.find((user) => user.code === code);
  }

  async findByAccountId(
    accountId: number,
    _ctx?: ITransactionContext,
  ): Promise<User | undefined> {
    const account = mockAccounts.find((account) => account.id === accountId);

    if (!account) {
      return undefined;
    }

    return this.users.find((user) => user.id === account.userId);
  }

  async findByUnitIds(
    unitIds: number[],
    _ctx?: ITransactionContext,
  ): Promise<User[]> {
    if (!unitIds.length) {
      return [];
    }

    const unitIdSet = new Set(unitIds);

    return this.users.filter(
      (user) => user.unitId !== null && unitIdSet.has(user.unitId),
    );
  }

  async findAll(_ctx?: ITransactionContext): Promise<User[]> {
    return [...this.users];
  }

  async updateProfile(id: number, data: UserProfileUpdate): Promise<User | undefined> {
    const index = this.users.findIndex((user) => user.id === id);
    if (index < 0) return undefined;

    const updatedUser: User = {
      ...this.users[index],
      ...data,
      updatedAt: new Date(),
    };
    this.users[index] = updatedUser;
    return updatedUser;
  }

  async create(data: CreateUserDto, _ctx?: ITransactionContext): Promise<User> {
    const now = new Date();

    const user: User = {
      id: this.nextId++,
      code: data.code,
      role: data.role,
      unitId: data.unitId,
      fullname: data.fullname,
      createdAt: now,
      updatedAt: now,
    };

    this.users.push(user);

    return user;
  }
}
