import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { User } from '../user.model';
import type { IUserRepository } from '../user.repository';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<User | undefined> {
    return (await this.prisma.user.findUnique({ where: { id } })) ?? undefined;
  }

  async findByIds(ids: number[]): Promise<User[]> {
    return this.prisma.user.findMany({ where: { id: { in: ids } } });
  }

  async findByCode(code: string): Promise<User | undefined> {
    return (await this.prisma.user.findUnique({ where: { code } })) ?? undefined;
  }

  async findByAccountId(accountId: number): Promise<User | undefined> {
    return (await this.prisma.user.findUnique({ where: { accountId } })) ?? undefined;
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({ orderBy: { id: 'asc' } });
  }
}