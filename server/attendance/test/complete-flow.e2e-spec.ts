/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter';
import { PrismaService } from '../src/common/database/prisma.service';

describe('Complete End-to-End Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let lecturerToken: string;
  let studentToken: string;
  let createdSessionId: number;
  let studentUserId: number;

  const targetStudentCode = '2312686';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Chuẩn bị token thông qua JwtService để đảm bảo test ổn định không phụ thuộc biến seed password ngoài môi trường
    const lecturerUser = await prisma.user.findFirst({
      where: { role: 'lecturer' },
      include: { account: true },
    });
    expect(lecturerUser).toBeDefined();

    const studentUser = await prisma.user.findFirst({
      where: { code: targetStudentCode },
      include: { account: true },
    });
    expect(studentUser).toBeDefined();
    studentUserId = studentUser!.id;

    const jwtService = app.get(JwtService);
    lecturerToken = jwtService.sign({
      sub: lecturerUser!.id,
      username: lecturerUser!.account.username,
      role: 'lecturer',
    });

    studentToken = jwtService.sign({
      sub: studentUser!.id,
      username: studentUser!.account.username,
      role: 'student',
    });
  });

  afterAll(async () => {
    if (createdSessionId) {
      await prisma.attendanceAttempt.deleteMany({
        where: { sessionId: createdSessionId },
      });
      await prisma.attendanceRecord.deleteMany({
        where: { sessionId: createdSessionId },
      });
      await prisma.attendanceSession.deleteMany({
        where: { id: createdSessionId },
      });
    }
    await app.close();
  });

  it('Bước 1: Giảng viên tạo phiên điểm danh mới (Open Session) với sinh viên chỉ định', async () => {
    const now = new Date();
    const openAt = new Date(now.getTime() - 1000 * 60 * 5).toISOString(); // Mở từ 5 phút trước
    const closeAt = new Date(now.getTime() + 1000 * 60 * 55).toISOString(); // Đóng sau 55 phút

    const res = await request(app.getHttpServer())
      .post('/v0/attendance-sessions')
      .set('Authorization', `Bearer ${lecturerToken}`)
      .send({
        title: 'Buổi học E2E - Lập trình Hệ thống',
        latitude: 11.9545,
        longitude: 108.4452,
        radius: 100, // 100 mét
        openAt,
        closeAt,
        participantCriteria: {
          codeFilter: {
            addCodes: [targetStudentCode],
          },
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('open');

    createdSessionId = res.body.data.id;
  });

  it('Bước 2: Sinh viên xem danh sách buổi học của mình qua /v0/attendance-sessions/mine', async () => {
    const res = await request(app.getHttpServer())
      .get('/v0/attendance-sessions/mine')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const sessionFound = res.body.data.find(
      (s: any) => s.id === createdSessionId,
    );
    expect(sessionFound).toBeDefined();
    expect(sessionFound.status).toBe('open');
  });

  it('Bước 3: Sinh viên gửi điểm danh hợp lệ (GPS trong bán kính, không mock)', async () => {
    // Tọa độ cách tâm ~15m
    const studentLat = 11.9545 + 0.0001;
    const studentLon = 108.4452;

    const res = await request(app.getHttpServer())
      .post('/attendance/check-in')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        sessionId: createdSessionId,
        location: {
          latitude: studentLat,
          longitude: studentLon,
          accuracy: 10,
          timestamp: Date.now(),
          isMockLocation: false,
        },
        device: {
          deviceId: 'E2E-FLOW-DEV-PHONE-99',
          platform: 'android',
          model: 'Pixel 9 Pro',
        },
        integrity: { integrityToken: null },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('VALID');
  });

  it('Bước 4: Xác minh kết quả chính xác trong cơ sở dữ liệu PostgreSQL', async () => {
    // 1. Kiểm tra AttendanceRecord
    const record = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_userId: {
          sessionId: createdSessionId,
          userId: studentUserId,
        },
      },
    });

    expect(record).toBeDefined();
    expect(record!.status).toBe('present');
    expect(record!.checkedInAt).not.toBeNull();
    expect(record!.deviceId).toBe('E2E-FLOW-DEV-PHONE-99');
    expect(Number(record!.distanceMeters)).toBeLessThan(100);

    // 2. Kiểm tra AttendanceAttempt
    const attempt = await prisma.attendanceAttempt.findFirst({
      where: {
        sessionId: createdSessionId,
        userId: studentUserId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(attempt).toBeDefined();
    expect(attempt!.result).toBe('APPROVED');
    expect(attempt!.isMockLocation).toBe(false);
    expect(attempt!.reasons).toHaveLength(0);
  });
});
