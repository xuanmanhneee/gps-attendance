import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';
import { readFileSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';

const dataPath = process.env.LOAD_DATA_PATH ?? '/perf-data/load-data.json';
const phase = process.env.VERIFY_PHASE ?? 'before-flush';
if (phase !== 'before-flush' && phase !== 'after-flush') {
  throw new Error('VERIFY_PHASE must be before-flush or after-flush');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const fixture = JSON.parse(readFileSync(dataPath, 'utf8')) as {
  sessionId: number;
  users: Array<{ userId: number }>;
};
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6370),
});

async function main(): Promise<void> {
  const buffered = await redis.hgetall(`attendance:buffer:${fixture.sessionId}`);
  const bufferRecords = Object.values(buffered).map(
    (raw) => JSON.parse(raw) as { status: string },
  );
  const persisted = await prisma.attendanceRecord.findMany({
    where: { sessionId: fixture.sessionId },
    select: { status: true },
  });
  const expected = fixture.users.length;
  const counts = {
    sessionId: fixture.sessionId,
    phase,
    expected,
    buffer: bufferRecords.length,
    bufferPresent: bufferRecords.filter((record) => record.status === 'present')
      .length,
    postgres: persisted.length,
    postgresPresent: persisted.filter((record) => record.status === 'present')
      .length,
  };
  console.log(JSON.stringify(counts));

  if (phase === 'before-flush') {
    if (
      counts.buffer !== expected ||
      counts.bufferPresent !== expected ||
      counts.postgres !== 0
    ) {
      throw new Error('Check-in result does not match the expected roster');
    }
  } else if (
    counts.buffer !== 0 ||
    counts.postgres !== expected ||
    counts.postgresPresent !== expected
  ) {
    throw new Error('PostgreSQL flush result does not match the expected roster');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([prisma.$disconnect(), redis.quit()]);
  });
