import 'dotenv/config';

import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { PrismaClient, UserRole } from '../src/prisma/generated/client';

const parsePositiveInt = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

const count = parsePositiveInt('LOAD_USERS', 1000);
const sessionMinutes = parsePositiveInt('LOAD_SESSION_MINUTES', 10);
const dataPath = process.env.LOAD_DATA_PATH ?? '/perf-data/load-data.json';
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is required');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6370),
});

const codeFor = (index: number) => `LOAD${String(index).padStart(6, '0')}`;
const usernameFor = (index: number) => `load-student-${String(index).padStart(6, '0')}`;

async function main(): Promise<void> {
  // Dữ liệu có prefix riêng để chạy lại script mà không nhân đôi user/account.
  let unit = await prisma.unit.findFirst({ where: { name: 'PERF_TEST_UNIT' } });
  if (!unit) {
    unit = await prisma.unit.create({
      data: { name: 'PERF_TEST_UNIT', level: 0 },
    });
  }

  await prisma.user.createMany({
    data: [
      {
        code: 'LOAD_LECTURER',
        role: UserRole.organizer,
        fullname: 'Performance Test Lecturer',
        unitId: unit.id,
      },
    ],
    skipDuplicates: true,
  });
  const lecturer = await prisma.user.findUniqueOrThrow({
    where: { code: 'LOAD_LECTURER' },
  });

  for (let start = 1; start <= count; start += 250) {
    const end = Math.min(start + 249, count);
    await prisma.user.createMany({
      data: Array.from({ length: end - start + 1 }, (_, offset) => {
        const index = start + offset;
        return {
          code: codeFor(index),
          role: UserRole.participant,
          fullname: `Performance Test Student ${index}`,
          unitId: unit.id,
        };
      }),
      skipDuplicates: true,
    });
  }

  const codes = Array.from({ length: count }, (_, index) => codeFor(index + 1));
  const students = await prisma.user.findMany({
    where: { code: { in: codes } },
    orderBy: { code: 'asc' },
  });
  if (students.length !== count) {
    throw new Error(`Expected ${count} students, found ${students.length}`);
  }

  const passwordHash = await bcrypt.hash('performance-test-only', 4);
  for (let start = 0; start < count; start += 250) {
    await prisma.account.createMany({
      data: students.slice(start, start + 250).map((student, offset) => ({
        username: usernameFor(start + offset + 1),
        passwordHash,
        userId: student.id,
      })),
      skipDuplicates: true,
    });
  }

  // Phiên đã mở và roster được chuẩn bị trực tiếp: đo riêng hot path check-in.
  // Job flush vẫn được lên lịch để kiểm tra dữ liệu sau khi phiên đóng.
  const now = Date.now();
  const closeAt = new Date(now + sessionMinutes * 60_000);
  const session = await prisma.attendanceSession.create({
    data: {
      title: `PERF_TEST_${now}`,
      latitude: 10,
      longitude: 106,
      radius: 100,
      openAt: new Date(now - 60_000),
      closeAt,
      createdBy: lecturer.id,
    },
  });

  const bufferKey = `attendance:buffer:${session.id}`;
  const pipeline = redis.pipeline();
  const updatedAt = new Date();
  for (const student of students) {
    pipeline.hset(
      bufferKey,
      String(student.id),
      JSON.stringify({
        sessionId: session.id,
        userId: student.id,
        status: 'absent',
        checkedInAt: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        updateBy: null,
        updatedAt,
      }),
    );
  }
  const results = await pipeline.exec();
  if (!results || results.some(([error]) => error)) {
    throw new Error('Failed to populate Redis attendance buffer');
  }

  const flushId = `flush:${session.id}`;
  await redis.hset(
    'scheduler:data',
    flushId,
    JSON.stringify({
      id: flushId,
      type: 'attendance:flush',
      payload: { sessionId: session.id },
      attempts: 0,
    }),
  );
  await redis.zadd('scheduler:index', closeAt.getTime(), flushId);

  const jwt = new JwtService({ secret, signOptions: { expiresIn: '1h' } });
  const fixture = {
    sessionId: session.id,
    latitude: 10,
    longitude: 106,
    closeAt: closeAt.toISOString(),
    users: students.map((student, index) => ({
      userId: student.id,
      deviceId: `load-device-${String(index + 1).padStart(6, '0')}`,
      token: jwt.sign({
        sub: student.id,
        username: usernameFor(index + 1),
        role: 'participant',
      }),
    })),
  };
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, JSON.stringify(fixture));
  console.log(
    JSON.stringify({
      sessionId: session.id,
      students: students.length,
      closeAt: fixture.closeAt,
      dataPath,
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
