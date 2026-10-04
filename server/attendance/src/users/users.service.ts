import { Inject, Injectable } from '@nestjs/common';

import type { User, UserProfileUpdate } from './user.model';
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

  async updateProfile(id: number, data: UserProfileUpdate): Promise<User | undefined> {
    return this.userRepository.updateProfile(id, data);
  }
}
