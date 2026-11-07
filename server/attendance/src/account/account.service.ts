import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UNIT_OF_WORK } from '../common/unit-of-work/unit-of-work.token';
import type { IUnitOfWork } from '../common/unit-of-work/unit-of-work.interface';
import { USER_REPOSITORY } from '../users/user.repository.token';
import { ACCOUNT_REPOSITORY } from './account.repository.token';
import type { IAccountRepository } from './account.repository';

import type {
  CreateAccountInput,
  Account,
  CreateAccountWithUserInput,
} from './account.model';
import type { User } from '../users/user.model';
import type { IUserRepository } from '../users/user.repository';

@Injectable()
export class AccountService {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,

    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,

    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async createAccountWithUser(
    input: CreateAccountWithUserInput,
  ): Promise<{ user: User; account: Account }> {
    const passwordHash = await bcrypt.hash(input.password, 10);

    return this.unitOfWork.runInTransaction(async (ctx) => {
      const user = await this.userRepository.create(
        {
          code: input.code,
          fullname: input.fullname,
          role: input.role,
          unitId: input.unitId,
        },
        ctx,
      );

      const account = await this.accountRepository.create(
        { userId: user.id, username: input.username, passwordHash },
        ctx,
      );

      return { user, account };
    });
  }

  async findByUsername(username: string): Promise<Account | undefined> {
    return this.accountRepository.findByUsername(username);
  }

  async findById(id: number): Promise<Account | undefined> {
    return this.accountRepository.findById(id);
  }

  async findByUserId(userId: number): Promise<Account | undefined> {
    return this.accountRepository.findByUserId(userId);
  }
}
