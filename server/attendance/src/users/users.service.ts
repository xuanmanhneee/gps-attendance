import { Inject, Injectable } from '@nestjs/common';

import type { User } from './user.model';
import type { IUserRepository } from './user.repository';
import { USER_REPOSITORY } from './user.repository.token';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async findById(id: number): Promise<User | undefined> {
    return this.userRepository.findById(id);
  }

  async findByIds(ids: number[]): Promise<User[]> {
    return this.userRepository.findByIds(ids);
  }

  findByCodes(codes: string[]): Promise<User[]> {
    return this.userRepository.findByCodes(codes);
  }

  async findByCode(code: string): Promise<User | undefined> {
    return this.userRepository.findByCode(code);
  }

  async findByAccountId(accountId: number): Promise<User | undefined> {
    return this.userRepository.findByAccountId(accountId);
  }

  findByUnitIds(unitIds: number[]): Promise<User[]> {
    return this.userRepository.findByUnitIds(unitIds);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async upsertByCode(input: {
    code: string;
    fullname: string;
    role: User['role'];
    unitId: number;
  }): Promise<'created' | 'updated' | 'unchanged'> {
    const existing = await this.userRepository.findByCode(input.code);
    if (!existing) {
      await this.userRepository.create(input);
      return 'created';
    }

    if (
      existing.fullname === input.fullname &&
      existing.role === input.role &&
      existing.unitId === input.unitId
    ) {
      return 'unchanged';
    }

    await this.userRepository.update(existing.id, input);
    return 'updated';
  }
}
