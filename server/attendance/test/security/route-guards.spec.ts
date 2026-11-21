import 'reflect-metadata';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';

import { AccountController } from '../../src/account/account.controller';
import { AppController } from '../../src/app.controller';
import { AttendanceCheckInController } from '../../src/attendance-check-in/attendance-check-in.controller';
import { AttendanceSessionsController } from '../../src/attendance-sessions/attendance-sessions.controller';
import { AdminAuthController } from '../../src/auth/controllers/admin-auth.controller';
import { UserAuthController } from '../../src/auth/controllers/user-auth.controller';
import { HealthController } from '../../src/health/health.controller';
import { TagController } from '../../src/tags/tag.controller';
import { UnitController } from '../../src/units/unit.controller';
import { UserController } from '../../src/users/user.controller';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../../src/auth/guards/local-auth.guard';
import { ClientRateLimitGuard } from '../../src/auth/guards/client-rate-limit.guard';

// Prisma client sinh ra là ESM, Jest không nạp được; test này chỉ đọc metadata
// của controller nên không cần Prisma thật.
jest.mock('../../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

type Ctor = { prototype: object; name: string };

const CONTROLLERS: Ctor[] = [
  AccountController,
  AppController,
  AttendanceCheckInController,
  AttendanceSessionsController,
  AdminAuthController,
  UserAuthController,
  HealthController,
  TagController,
  UnitController,
  UserController,
];

// Route công khai có chủ đích. Thêm route mới vào đây là một quyết định phải
// được review: mọi route khác BẮT BUỘC có JwtAuthGuard hoặc LocalAuthGuard.
const PUBLIC_ROUTES = new Set([
  'AppController.getHello',
  'HealthController.check',
  // Refresh token tự nó là credential; được bảo vệ bằng rate limit.
  'AdminAuthController.refresh',
  'AdminAuthController.logout',
  'UserAuthController.refresh',
  'UserAuthController.logout',
]);

function handlerOf(ctor: Ctor, method: string): object {
  return (ctor.prototype as Record<string, object>)[method];
}

function guardsOf(ctor: Ctor, method: string): unknown[] {
  const onClass: unknown[] = Reflect.getMetadata(GUARDS_METADATA, ctor) ?? [];
  const onMethod: unknown[] =
    Reflect.getMetadata(GUARDS_METADATA, handlerOf(ctor, method)) ?? [];
  return [...onClass, ...onMethod];
}

function routesOf(ctor: Ctor): string[] {
  return Object.getOwnPropertyNames(ctor.prototype).filter((name) => {
    if (name === 'constructor') return false;
    const handler = handlerOf(ctor, name);
    return (
      typeof handler === 'function' &&
      Reflect.getMetadata(METHOD_METADATA, handler) !== undefined
    );
  });
}

describe('route guards', () => {
  const cases = CONTROLLERS.flatMap((ctor) =>
    routesOf(ctor).map((method) => ({
      id: `${ctor.name}.${method}`,
      guards: guardsOf(ctor, method),
    })),
  );

  it('tìm thấy route để kiểm tra (tránh test rỗng vô nghĩa)', () => {
    expect(cases.length).toBeGreaterThan(30);
  });

  it.each(cases.map((c) => [c.id, c.guards] as const))(
    '%s có guard xác thực hoặc nằm trong danh sách công khai',
    (id, guards) => {
      if (PUBLIC_ROUTES.has(id)) return;
      const authenticated =
        guards.includes(JwtAuthGuard) || guards.includes(LocalAuthGuard);
      expect(authenticated).toBe(true);
    },
  );

  it('route login/refresh/logout luôn có rate limit', () => {
    const authRoutes = cases.filter((c) => c.id.includes('AuthController'));
    expect(authRoutes.length).toBe(6);
    for (const c of authRoutes) {
      expect(c.guards).toContain(ClientRateLimitGuard);
    }
  });

  it('danh sách route công khai không chứa route đã biến mất', () => {
    const ids = new Set(cases.map((c) => c.id));
    for (const id of PUBLIC_ROUTES) expect(ids).toContain(id);
  });
});
