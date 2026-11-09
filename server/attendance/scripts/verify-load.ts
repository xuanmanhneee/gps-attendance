import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';
import { readFileSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';

const dataPath = process.env.LOAD_DATA_PATH ?? '/perf-data/load-data.json';
const phase = process.env.VERIFY_PHASE ?? 'before-flush';
const ATTEMPT_QUEUE_TIMEOUT_MS = 60_000;
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
  const deadline = Date.now() + ATTEMPT_QUEUE_TIMEOUT_MS;
  let pendingAttempts = -1;
  let queuedAttempts = -1;
  let persistedAttempts = 0;
  while (Date.now() < deadline) {
    [pendingAttempts, queuedAttempts, persistedAttempts] = await Promise.all([
      redis.zcard('attendance:attempts:pending-index'),
      redis.zcard('attendance:attempts:queue'),
      prisma.attendanceAttempt.count({
        where: { sessionId: fixture.sessionId },
      }),
    ]);
    if (
      pendingAttempts === 0 &&
      queuedAttempts === 0 &&
      persistedAttempts === fixture.users.length
    ) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const [historyEvents, auditLogs, integrityChecks] = await Promise.all([
    prisma.attendanceHistoryEvent.count({
      where: { sessionId: fixture.sessionId },
    }),
    prisma.auditLog.count({
      where: {
        entityType: 'attendance_check_in',
        entityId: String(fixture.sessionId),
      },
    }),
    prisma.deviceIntegrityCheck.count({
      where: { sessionId: fixture.sessionId },
    }),
  ]);
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
    pendingAttempts,
    queuedAttempts,
    persistedAttempts,
    historyEvents,
    auditLogs,
    integrityChecks,
  };
  console.log(JSON.stringify(counts));

  if (
    pendingAttempts !== 0 ||
    queuedAttempts !== 0 ||
    persistedAttempts !== expected ||
    historyEvents !== expected * 2 ||
    auditLogs !== expected * 2 ||
    integrityChecks !== expected
  ) {
    throw new Error('Asynchronous check-in evidence did not persist completely');
  }

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
