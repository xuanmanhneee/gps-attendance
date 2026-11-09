// src/users/infra/in-memory/in-memory-user.repository.ts
import type { IUserRepository } from '../../user.repository';
import type { User } from '../../user.model';
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

  async findByCodes(codes: string[]): Promise<User[]> {
    const codeSet = new Set(codes);
    return this.users.filter((user) => codeSet.has(user.code));
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

  async update(
    id: number,
    data: Partial<Pick<User, 'fullname' | 'role' | 'unitId'>>,
  ): Promise<User> {
    const index = this.users.findIndex((user) => user.id === id);
    if (index < 0) throw new Error(`User ${id} not found`);
    const updated = { ...this.users[index], ...data, updatedAt: new Date() };
    this.users[index] = updated;
    return updated;
  }
}
