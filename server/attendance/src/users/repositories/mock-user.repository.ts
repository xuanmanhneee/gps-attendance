import { Injectable } from '@nestjs/common';

import { MOCK_USERS } from '../mocks/users.mock';
import type { User } from '../user.model';
import type { IUserRepository } from '../user.repository';

@Injectable()
export class MockUserRepository implements IUserRepository {
  async findById(id: number): Promise<User | undefined> {
    return MOCK_USERS.find((user) => user.id === id);
  }

  async findByCode(code: string): Promise<User | undefined> {
    return MOCK_USERS.find((user) => user.code === code);
  }

  async findByAccountId(accountId: number): Promise<User | undefined> {
    return MOCK_USERS.find((user) => user.accountId === accountId);
  }

  async findAll(): Promise<User[]> {
    return MOCK_USERS;
  }
}
