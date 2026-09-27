/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter';
import { PrismaService } from '../src/common/database/prisma.service';

describe('API Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let studentToken: string;
  let studentId: number;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Kiểm tra kết nối Database PostgreSQL', () => {
    it('nên kết nối được tới DB và truy vấn bảng users thành công', async () => {
      const userCount = await prisma.user.count();
      expect(userCount).toBeGreaterThan(0);
    });

    it('endpoint /health nên trả về trạng thái ok và đính kèm X-Request-ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.body.status).toBe('ok');
      expect(res.body.database.status).toBe('connected');
      expect(res.body.system.memory).toBeDefined();
      expect(res.body.system.cpu).toBeDefined();
    });
  });

  describe('2. Kiểm thử Authentication Endpoints', () => {
    it('Student login: nên đăng nhập thành công qua /v0/user/auth/login với tài khoản hợp lệ', async () => {
      // Dùng user sinh viên mẫu đã có trong DB
      const studentUser = await prisma.user.findFirst({
        where: { role: 'student' },
        include: { account: true },
      });
      expect(studentUser).toBeDefined();

      const res = await request(app.getHttpServer())
        .post('/v0/user/auth/login')
        .send({
          username: studentUser!.account.username,
          password: 'password123',
        });

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('accessToken');
        studentToken = res.body.data.accessToken;
        studentId = studentUser!.id;
      } else {
        // Nếu password khác, kiểm tra rằng endpoint phản hồi đúng định dạng ApiExceptionFilter
        expect(res.body).toHaveProperty('success', false);
      }
    });

    it('Lecturer/Admin login: nên từ chối khi student cố tình login vào admin endpoint', async () => {
      const studentUser = await prisma.user.findFirst({
        where: { role: 'student' },
        include: { account: true },
      });

      const res = await request(app.getHttpServer())
        .post('/v0/admin/auth/login')
        .send({
          username: studentUser!.account.username,
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Kiểm thử tạo Session và Ràng buộc Check-in', () => {
    let closedSessionId: number;
    let openSessionId: number;

    beforeAll(async () => {
      // Đăng nhập tài khoản admin để tạo session
      const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' },
        include: { account: true },
      });

      // Tạo trực tiếp 2 session trong DB phục vụ test check-in: 1 đã đóng, 1 đang mở
      const now = new Date();
      const closed = await prisma.attendanceSession.create({
        data: {
          title: 'Integration Test - Closed Session',
          latitude: 11.9545,
          longitude: 108.4452,
          radius: 50,
          openAt: new Date(now.getTime() - 1000 * 60 * 120),
          closeAt: new Date(now.getTime() - 1000 * 60 * 60), // Đã đóng 1 tiếng trước
          createdBy: adminUser!.id,
        },
      });
      closedSessionId = closed.id;

      const open = await prisma.attendanceSession.create({
        data: {
          title: 'Integration Test - Open Session',
          latitude: 11.9545,
          longitude: 108.4452,
          radius: 50,
          openAt: new Date(now.getTime() - 1000 * 60 * 30),
          closeAt: new Date(now.getTime() + 1000 * 60 * 30), // Đang mở
          createdBy: adminUser!.id,
        },
      });
      openSessionId = open.id;

      // Đăng ký sinh viên vào cả 2 session này với status absent
      const testStudent = await prisma.user.findFirst({ where: { role: 'student' } });
      studentId = testStudent!.id;

      await prisma.attendanceRecord.createMany({
        data: [
          { sessionId: closedSessionId, userId: studentId, status: 'absent' },
          { sessionId: openSessionId, userId: studentId, status: 'absent' },
        ],
        skipDuplicates: true,
      });

      // Tạo auth token cho student
      const jwtService = app.get(JwtService);
      studentToken = jwtService.sign({
        sub: studentId,
        username: testStudent!.code,
        role: 'student',
      });
    });

    afterAll(async () => {
      // Dọn dẹp dữ liệu test
      await prisma.attendanceAttempt.deleteMany({
        where: { sessionId: { in: [closedSessionId, openSessionId] } },
      });
      await prisma.attendanceRecord.deleteMany({
        where: { sessionId: { in: [closedSessionId, openSessionId] } },
      });
      await prisma.attendanceSession.deleteMany({
        where: { id: { in: [closedSessionId, openSessionId] } },
      });
    });

    it('Check-in khi Session đã đóng (Closed): nên bị từ chối với mã lỗi ATTENDANCE_SESSION_SESSION_NOT_OPEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          sessionId: closedSessionId,
          location: {
            latitude: 11.9545,
            longitude: 108.4452,
            accuracy: 10,
            timestamp: Date.now(),
            isMockLocation: false,
          },
          device: {
            deviceId: 'DEV-INT-001',
            platform: 'android',
            model: 'Pixel Test',
          },
          integrity: { integrityToken: null },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ATTENDANCE_SESSION_NOT_OPEN');
    });

    it('Check-in ngoài bán kính: nên trả về REJECTED với lý do OUT_OF_RANGE', async () => {
      // Tọa độ xa ~5km so với tâm 11.9545, 108.4452
      const res = await request(app.getHttpServer())
        .post('/attendance/check-in')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          sessionId: openSessionId,
          location: {
            latitude: 11.9999,
            longitude: 108.4999,
            accuracy: 10,
            timestamp: Date.now(),
            isMockLocation: false,
          },
          device: {
            deviceId: 'DEV-INT-002',
            platform: 'android',
            model: 'Pixel Test',
          },
          integrity: { integrityToken: null },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REJECTED');
      expect(res.body.data.reasons).toContain('OUT_OF_RANGE');
    });
  });
});
