import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { Account } from './account.model';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<Account | undefined> {
    return (await this.prisma.account.findUnique({ where: { username } })) ?? undefined;
  }

  async findById(id: number): Promise<Account | undefined> {
    return (await this.prisma.account.findUnique({ where: { id } })) ?? undefined;
  }
}
