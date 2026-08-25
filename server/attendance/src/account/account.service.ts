import { Injectable } from "@nestjs/common";
import { Account } from "./account.model";
import { MOCK_ACCOUNTS } from "./mocks/accounts.mock";

@Injectable()
export class AccountService {
  async findByUsername(username: string): Promise<Account | undefined> {
    return MOCK_ACCOUNTS.find(
      (account) => account.username === username,
    );
  }

  async findById(id: number): Promise<Account | undefined> {
    return MOCK_ACCOUNTS.find(
      (account) => account.id === id,
    );
  }
}