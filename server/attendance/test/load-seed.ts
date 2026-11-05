import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const databaseName = new URL(databaseUrl).pathname.replace(/^\/+|\/+$/g, '');
if (
  process.env.NODE_ENV !== 'test' ||
  process.env.LOAD_TEST_MODE !== 'true' ||
  databaseName !== 'gps_attendance_loadtest'
) {
  throw new Error(
    'Seeder is restricted to NODE_ENV=test, LOAD_TEST_MODE=true, and gps_attendance_loadtest',
  );
}

const userCount = Number(process.env.LOAD_TEST_USERS ?? 350);
if (!Number.isInteger(userCount) || userCount < 300 || userCount > 350) {
  throw new Error('LOAD_TEST_USERS must be an integer from 300 to 350');
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.startsWith('replace-with-')) {
  throw new Error('Set a non-placeholder JWT_SECRET for the isolated load-test API');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const passwordHash = await bcrypt.hash(randomUUID(), 10);
  const lecturer = await prisma.user.upsert({
    where: { code: 'LOADTEST_LECTURER' },
    update: { role: Role.lecturer, fullname: 'Load Test Lecturer' },
    create: {
      code: 'LOADTEST_LECTURER',
      role: Role.lecturer,
      fullname: 'Load Test Lecturer',
    },
  });

  await prisma.account.upsert({
    where: { userId: lecturer.id },
    update: { username: 'loadtest_lecturer', passwordHash },
    create: {
      userId: lecturer.id,
      username: 'loadtest_lecturer',
      passwordHash,
    },
  });

  const students: Array<{ id: number; username: string }> = [];
  for (let index = 1; index <= userCount; index += 1) {
    const suffix = String(index).padStart(4, '0');
    const username = `loadtest_${suffix}`;
    const user = await prisma.user.upsert({
      where: { code: `LOADTEST_${suffix}` },
      update: {
        role: Role.student,
        fullname: `Load Test Student ${suffix}`,
      },
      create: {
        code: `LOADTEST_${suffix}`,
        role: Role.student,
        fullname: `Load Test Student ${suffix}`,
      },
      select: { id: true },
    });

    await prisma.account.upsert({
      where: { userId: user.id },
      update: { username, passwordHash },
      create: { userId: user.id, username, passwordHash },
    });
    students.push({ id: user.id, username });
  }

  const now = new Date();
  const session = await prisma.$transaction(async (transaction) => {
    const createdSession = await transaction.attendanceSession.create({
      data: {
        title: `Load Test ${now.toISOString()}`,
        latitude: 11.9404,
        longitude: 108.4583,
        radius: 5000,
        gpsAccuracyThreshold: 100,
        openAt: new Date(now.getTime() - 60_000),
        closeAt: new Date(now.getTime() + 30 * 60_000),
        status: 'open',
        createdBy: lecturer.id,
      },
    });

    await transaction.attendanceRecord.createMany({
      data: students.map(({ id }) => ({
        sessionId: createdSession.id,
        userId: id,
        status: 'absent',
      })),
    });
    return createdSession;
  });

  const issuer = process.env.JWT_ISSUER ?? 'gps-attendance';
  const audience = process.env.JWT_AUDIENCE ?? 'gps-attendance-app';
  const jwt = new JwtService();
  const fixtures = students.map(({ id, username }, index) => ({
    token: jwt.sign(
      {
        sub: id,
        username,
        role: 'student',
        jti: randomUUID(),
        iat: Math.floor(Date.now() / 1000),
      },
      {
        secret: jwtSecret,
        expiresIn: '1h',
        issuer,
        audience,
      },
    ),
    payload: {
      sessionId: session.id,
      location: {
        latitude: 11.9404,
        longitude: 108.4583,
        accuracy: 5,
        timestamp: Date.now(),
        isMockLocation: false,
      },
      device: {
        deviceId: `loadtest-device-${String(index + 1).padStart(4, '0')}`,
        platform: 'android' as const,
        model: 'k6-load-test',
      },
      integrity: { integrityToken: null },
    },
  }));

  const fixtureDirectory = resolve(process.cwd(), '../../tests/load');
  await mkdir(fixtureDirectory, { recursive: true });
  await writeFile(
    resolve(fixtureDirectory, 'checkin-fixtures.local.json'),
    `${JSON.stringify(fixtures, null, 2)}\n`,
    { mode: 0o600 },
  );

  console.log(
    JSON.stringify({
      usersCreatedOrReused: students.length,
      sessionId: session.id,
      fixtureFile: 'tests/load/checkin-fixtures.local.json',
      tokensWritten: students.length,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error('Load-test seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });