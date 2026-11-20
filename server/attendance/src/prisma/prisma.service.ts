import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DEFAULT_DB_POOL_MAX = 15;

// Giới hạn số kết nối mỗi instance mở tới PostgreSQL. Khi chạy nhiều instance
// sau load balancer, tổng DB_POOL_MAX của các instance phải nhỏ hơn
// max_connections của Postgres, nếu không request sẽ lỗi khi tải tăng đột biến.
function readPoolMax(): number {
  const raw = process.env.DB_POOL_MAX;
  if (raw === undefined || raw === '') return DEFAULT_DB_POOL_MAX;

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error('DB_POOL_MAX must be a positive integer');
  }
  return value;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      max: readPoolMax(),
      // Báo lỗi sớm khi pool cạn thay vì để request treo vô thời hạn.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
