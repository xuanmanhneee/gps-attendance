import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const poolMax = Number(configService.get<string>('DB_POOL_MAX') ?? 15);
    if (!Number.isSafeInteger(poolMax) || poolMax < 1) {
      throw new Error('DB_POOL_MAX must be a positive integer');
    }

    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
      max: poolMax,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}