import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Account } from '../account.model';
import { IAccountRepository } from '../account.repository';

@Injectable()
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<Account | undefined> {
    const record = await this.prisma.account.findUnique({
      where: { username },
    });
    if (!record) return undefined;

    return {
      id: record.id,
      username: record.username,
      password: record.password,
    };
  }

  async findById(id: number): Promise<Account | undefined> {
    const record = await this.prisma.account.findUnique({
      where: { id },
    });
    if (!record) return undefined;

    return {
      id: record.id,
      username: record.username,
      password: record.password,
    };
  }
}
