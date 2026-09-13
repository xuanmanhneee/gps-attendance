import { Inject, Injectable } from '@nestjs/common';
import { Account } from './account.model';
import { IAccountRepository } from './account.repository';
import { ACCOUNT_REPOSITORY } from './account.repository.token';

@Injectable()
export class AccountService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
  ) {}

  async findByUsername(username: string): Promise<Account | undefined> {
    return this.accountRepository.findByUsername(username);
  }

  async findById(id: number): Promise<Account | undefined> {
    return this.accountRepository.findById(id);
  }
}
