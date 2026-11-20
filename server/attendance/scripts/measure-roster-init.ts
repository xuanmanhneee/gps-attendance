import 'dotenv/config';

import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';

import { PrismaClient } from '../src/prisma/generated/client';

// Đo thời gian tạo phiên kèm khởi tạo roster qua API. openAt = hiện tại nên
// roster được khởi tạo ngay trong request POST, thời gian request bao gồm
// toàn bộ việc ghi bản ghi `absent` vào Redis. Cần chạy `prepare` trước để
// có PERF_TEST_UNIT, LOAD_LECTURER và các sinh viên LOAD.

const apiUrl = process.env.API_URL ?? 'http://load-balancer';
const runs = Number(process.env.ROSTER_RUNS ?? 5);
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is required');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!Number.isSafeInteger(runs) || runs < 1) {
  throw new Error('ROSTER_RUNS must be a positive integer');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6370),
});

async function main(): Promise<void> {
  const unit = await prisma.unit.findFirstOrThrow({
    where: { name: 'PERF_TEST_UNIT' },
  });
  const lecturer = await prisma.user.findUniqueOrThrow({
    where: { code: 'LOAD_LECTURER' },
  });
  const token = new JwtService({ secret }).sign(
    { sub: lecturer.id, username: 'load-lecturer', role: 'organizer' },
    { expiresIn: '10m' },
  );
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const durations: number[] = [];
  for (let run = 1; run <= runs; run += 1) {
    const now = Date.now();
    const started = performance.now();
    const response = await fetch(`${apiUrl}/v0/attendance-sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `PERF_ROSTER_${now}`,
        latitude: 10,
        longitude: 106,
        radius: 100,
        openAt: new Date(now).toISOString(),
        closeAt: new Date(now + 10 * 60_000).toISOString(),
        participantCriteria: {
          unitFilter: { include: [unit.id], exclude: [] },
        },
      }),
    });
    const elapsed = performance.now() - started;
    const body = (await response.json()) as {
      success: boolean;
      data?: { id: number };
    };
    if (!response.ok || !body.success || !body.data) {
      throw new Error(`Create failed: ${response.status} ${JSON.stringify(body)}`);
    }

    const sessionId = body.data.id;
    const roster = await redis.hlen(`attendance:buffer:${sessionId}`);
    durations.push(elapsed);
    console.log(
      JSON.stringify({ run, sessionId, roster, ms: Math.round(elapsed) }),
    );

    // Huỷ để job flush không ghi roster thử nghiệm xuống PostgreSQL.
    await fetch(`${apiUrl}/v0/attendance-sessions/${sessionId}/cancel`, {
      method: 'PATCH',
      headers,
    });
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const mean = durations.reduce((sum, value) => sum + value, 0) / runs;
  console.log(
    JSON.stringify({
      runs,
      minMs: Math.round(sorted[0]),
      medianMs: Math.round(sorted[Math.floor(runs / 2)]),
      meanMs: Math.round(mean),
      maxMs: Math.round(sorted[runs - 1]),
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([prisma.$disconnect(), redis.quit()]);
  });
