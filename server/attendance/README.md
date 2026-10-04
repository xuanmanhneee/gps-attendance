# Backend API — `@gps-attendance/attendance`

API NestJS 11 của hệ thống điểm danh GPS. Đây là tầng trung tâm: auth JWT, phiên điểm danh, check-in GPS, chống gian lận, persistence Prisma + PostgreSQL.

Tổng quan monorepo: [../../README.md](../../README.md). Hệ thống đầy đủ: [../../docs/SYSTEM.md](../../docs/SYSTEM.md). Contract: `@gps-attendance/shared`.

---

## 1. Phạm vi package

Mọi thứ trong `server/attendance/` thuộc backend này: `src/` (Nest modules), `prisma/`, `test/` (e2e), `Dockerfile`, env, Jest.

**Không** chứa UI dashboard/mobile. Shared types nằm ở `packages/shared`.

---

## 2. Công nghệ

| Hạng mục | Công nghệ |
|---|---|
| Runtime | NestJS 11, Express, TypeScript |
| Auth | Passport local + JWT, bcryptjs |
| DB | Prisma 7 + `@prisma/adapter-pg` + PostgreSQL 16 |
| HTTP | class-validator / class-transformer, Swagger (`/api-docs`) |
| Bảo vệ | `@nestjs/throttler` (5 req/60s global; login 5/60s; check-in 3/60s) |
| Log | Winston JSON, request-id, HTTP interceptor |
| Test | Jest unit (`*.spec.ts` trong `src/`), e2e (`test/`) |

---

## 3. Bootstrap và `AppModule`

`src/main.ts`:

- Logger: `WinstonJsonLogger`
- Global filter: `ApiExceptionFilter` → `{ success: false, code, message }`
- CORS mở (`enableCors()`)
- `ValidationPipe` (`whitelist`, `transform`)
- Swagger: `http://localhost:3000/api-docs` (Bearer)
- Listen `0.0.0.0`, cổng `PORT` hoặc `3000`

`src/app.module.ts` import: Config (global), Throttler, Database, Auth, Users, AttendanceSessions, Geo, AttendanceValidation, AttendanceCheckIn, Logging, Health.

- Middleware: `RequestIdMiddleware` mọi route
- Guard toàn cục: `ThrottlerGuard`
- Interceptor: `HttpLoggingInterceptor`

`AppController` + `AppService`: `GET /` ping.

---

## 4. Cấu trúc `src/` — từng module

```text
src/
├── main.ts / app.module.ts / app.controller.ts / app.service.ts
├── auth/
├── account/
├── users/
├── attendance-sessions/
├── attendance-check-in/
├── attendance-validation/
├── attendance-record/
├── geo/
├── health/
└── common/
```

### 4.1 `auth/` — đăng nhập và JWT

| File | Việc |
|---|---|
| `auth.module.ts` | JwtModule async (`JWT_SECRET`, `EXPIRES_IN`), import Users + Account |
| `auth.service.ts` | validate bcrypt, `login()` access+refresh, `refresh()` |
| `controllers/user-auth.controller.ts` | `POST /v0/user/auth/login` (chỉ student), `POST /v0/user/auth/refresh` |
| `controllers/admin-auth.controller.ts` | `POST /v0/admin/auth/login` (lecturer/admin), `POST /v0/admin/auth/refresh` |
| `strategies/local.strategy.ts` | username/password |
| `strategies/jwt.strategy.ts` | Bearer, payload `{ sub, username, role }` |
| `guards/local-auth.guard.ts` | login |
| `guards/jwt-auth.guard.ts` | route bảo vệ |
| `guards/roles.guard.ts` | `@Roles()` |
| `decorators/current-user.decorator.ts` | `@CurrentUser()` |
| `decorators/roles.decorator.ts` | `@Roles(...)` |
| `dto/login.dto.ts` | body login |
| `types/authenticated-user.type.ts` | `{ userId, username, role }` |
| `types/authenticated-request.ts` | Request + user |
| `auth.service.spec.ts`, `guards/roles.guard.spec.ts` | unit test |

**Chưa có** `POST .../logout` (revoke token).

### 4.2 `account/` — tài khoản đăng nhập

| File | Việc |
|---|---|
| `account.module.ts` | bind Prisma repository |
| `account.service.ts` | tìm account theo username |
| `account.model.ts` | domain Account |
| `account.repository.ts` | interface |
| `account.repository.token.ts` | DI token |
| `repositories/prisma-account.repository.ts` | bảng `accounts` |

Không có HTTP controller riêng; Auth dùng service này.

### 4.3 `users/` — hồ sơ người dùng

| File | Việc |
|---|---|
| `users.module.ts` | PrismaUserRepository, UsersService, UserFilterService |
| `user.controller.ts` | `GET /users/me`, `GET /users` (admin), `GET /users/:id` (admin) |
| `users.service.ts` | CRUD đọc user |
| `user-filter.service.ts` | phân bổ SV khi tạo session (`codeFilter.addCodes`, ALL, fallback toàn bộ SV) |
| `user.model.ts` | domain User |
| `user.repository.ts` + `user.repository.token.ts` | interface + token |
| `repositories/prisma-user.repository.ts` | production |
| `repositories/mock-user.repository.ts` + `mocks/users.mock.ts` | **chỉ test** |

### 4.4 `attendance-sessions/` — phiên điểm danh

| File | Việc |
|---|---|
| `attendance-sessions.module.ts` | service, query, Prisma repo |
| `attendance-sessions.controller.ts` | dual path `attendance-sessions` và `v0/attendance-sessions` |
| `attendance-sessions.service.ts` | tạo (transaction + record absent), list, xóa cascade, đóng sớm |
| `attendance-session-query.service.ts` | `GET :id/detail` (SV + attempts) |
| `attendance-session.model.ts` | domain + status computed `pending/open/closed` |
| `attendance-session.mapper.ts` | entity → `AttendanceSessionResponse` |
| `attendance-session.repository.ts` + `*.token.ts` | interface |
| `repositories/prisma-attendance-session.repository.ts` | production |
| `dto/create-attendance-session.dto.ts` | title, GPS, radius, openAt/closeAt, participantCriteria |
| `dto/check-location.dto.ts` | DTO vị trí (phụ) |
| `attendance-session.seeder.ts` | seed phiên test — **không đăng ký trong module**, không chạy lúc boot |

Route HTTP: xem mục 5.

### 4.5 `attendance-check-in/` — điểm danh GPS

| File | Việc |
|---|---|
| `attendance-check-in.module.ts` | wire store Prisma, AttemptCheck, DeviceCheck |
| `attendance-check-in.controller.ts` | `POST /attendance/check-in` và `v0/...`, role student, throttle 3/60s |
| `attendance-check-in.service.ts` | pipeline: session → attempt → record → device → validation → present |
| `attendance-check-in.dto.ts` | location, device, integrity (class-validator) |
| `attendance-check-in.token.ts` | DI attempt + device usage |
| `checks/attempt.check.ts` | tối đa **3** lần thử / user / session |
| `checks/device.check.ts` | cùng `deviceId` không dùng cho 2 SV trong 1 session |
| `repositories/attendance-check-in-attempt.repository.ts` | interface attempt |
| `repositories/attendance-check-in-device-usage.repository.ts` | interface device |
| `infra/prisma/prisma-attendance-check-in.store.ts` | implement cả hai |

### 4.6 `attendance-validation/` — điểm tin cậy GPS

| File | Việc |
|---|---|
| `attendance-validation.module.ts` | export service |
| `attendance-validation.service.ts` | trọng số location 40, mock 25, integrity 35; VALID / REVIEW / REJECTED |
| `attendance-validation.types.ts` | input/result nội bộ |
| `checks/location.check.ts` | Haversine + accuracy vs radius |
| `checks/mock-location.check.ts` | `isMockLocation` |
| `checks/integrity.check.ts` | token có → 0.7, không → 0.5; **chưa verify Play Integrity / App Attest** |
| `*.spec.ts` | unit test service + location |

### 4.7 `attendance-record/` — bản ghi điểm danh

| File | Việc |
|---|---|
| `attendance-record.module.ts` | Prisma repo + service + controller |
| `attendance-record.controller.ts` | `GET /attendance/records/mine` và `v0/...` |
| `attendance-records.service.ts` | lịch sử chi tiết, `markPresent`, `getBySessionAndUser` |
| `attendance-record.model.ts` | domain record |
| `attendance-record.repository.ts` + `*.token.ts` | interface |
| `repositories/prisma-attendance-record.repository.ts` | production |
| `repositories/mock-attendance-record.repository.ts` | **chỉ test** |

Không có API chi tiết 1 record theo id (mobile `getAttendanceRecord` sẽ fail cứng).

### 4.8 `geo/` — khoảng cách

| File | Việc |
|---|---|
| `geo.module.ts` | export GeoService |
| `geo.service.ts` | Haversine, R = 6_371_000 m, `isWithinRadius` |
| `geo.service.spec.ts` | unit test |

### 4.9 `health/` — sức khỏe hệ thống

| File | Việc |
|---|---|
| `health.controller.ts` | `GET /health` và `/v0/health`; 200 hoặc 503 |
| `health.service.ts` | `SELECT 1` DB, đếm `_prisma_migrations`, RAM/CPU, `ok/degraded/error` |
| `health.module.ts` | module |
| `health.service.spec.ts` | unit test |

### 4.10 `common/` — hạ tầng ngang

| File | Việc |
|---|---|
| `database/database.module.ts` | Prisma global |
| `database/prisma.service.ts` | PrismaClient + adapter pg |
| `filters/api-exception.filter.ts` | HTTP → ApiResponse lỗi (dùng global) |
| `filters/all-exception.filter.ts` | filter phụ |
| `middleware/request-id.middleware.ts` | gán request id |
| `middleware/request-id.middleware.spec.ts` | test |
| `interceptors/http-logging.interceptor.ts` | log request/response (global) |
| `interceptors/response.interceptor.ts` | **không gắn** trong AppModule |
| `logging/logging.module.ts` | DI logger |
| `logging/winston-logger.service.ts` | JSON logger dùng ở bootstrap |
| `logging/nest-logger.adapter.ts`, `nest-logger.factory.ts` | adapter Nest |
| `logging/logger.factory.ts`, `logger.interface.ts`, `logger.token.ts` | abstraction |
| `logging/app-bootstrap.logger.ts` | log lúc start |

---

## 5. Danh sách API

Nhiều controller khai báo **cả path cũ và `v0/`**.

### Auth

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/v0/user/auth/login` | student |
| POST | `/v0/user/auth/refresh` | body `refreshToken` |
| POST | `/v0/admin/auth/login` | lecturer/admin |
| POST | `/v0/admin/auth/refresh` | |

Trả `{ accessToken, refreshToken }`. Access: `JWT_SECRET` / `EXPIRES_IN` (mặc định 1h). Refresh: `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_EXPIRES_IN` (mặc định 14d).

### Health / ping

| Method | Path |
|---|---|
| GET | `/`, `/health`, `/v0/health` |

### Users

| Method | Path | Role |
|---|---|---|
| GET | `/users/me` | JWT |
| GET | `/users` | admin |
| GET | `/users/:id` | admin |

### Sessions (`/attendance-sessions` và `/v0/attendance-sessions`)

| Method | Path | Role |
|---|---|---|
| POST | `/` | admin, lecturer |
| GET | `/mine` | student |
| GET | `/created-by-me` | lecturer, admin |
| GET | `/created-by?userId=` | admin |
| GET | `/` | admin tất cả; lecturer của mình |
| DELETE | `/:id` | admin hoặc người tạo |
| POST | `/:id/close` | admin hoặc người tạo |
| GET | `/by-user/:userId` | admin |
| GET | `/:id/detail` | admin, lecturer |
| GET | `/:id` | admin, lecturer |

Status phiên **không lưu DB**: `now < openAt` → pending; trong `[openAt, closeAt]` → open; sau `closeAt` → closed.

### Check-in / records

| Method | Path | Role |
|---|---|---|
| POST | `/attendance/check-in` (`v0`) | student |
| GET | `/attendance/records/mine` (`v0`) | JWT |

Kết quả check-in: `VALID` | `REVIEW` | `REJECTED` (+ `reasons`).

---

## 6. Database (Prisma)

`prisma/schema.prisma` — PostgreSQL.

| Model | Bảng | Ý nghĩa |
|---|---|---|
| `Account` | `accounts` | username unique, password hash |
| `User` | `users` | code unique, role, fullname, 1-1 Account |
| `AttendanceSession` | `attendance_sessions` | tâm GPS, radius, openAt/closeAt, createdBy |
| `AttendanceRecord` | `attendance_records` | unique (sessionId, userId); absent/present/late/excused |
| `AttendanceAttempt` | `attendance_attempts` | mỗi lần thử; APPROVED/REVIEW/REJECTED; reasons[] |

Enum: `Role`, `AttendanceStatus`, `AttendanceAttemptResult`.

Migration:

- `20260912000000_init`
- `20260918000000_phase1_indexes`
- `20260918000100_attendance_attempt_audit`
- `20260919000000_relax_gps_accuracy_check`

`prisma/seed.ts`: chỉ khi `NODE_ENV=development`. Username: `admin`, `quangtn`, SV `2312686`… Mật khẩu lấy từ `SEED_*_PASSWORD`; nếu các biến mật khẩu sinh viên bị bỏ trống thì mặc định là `123456` trong môi trường dev.

---

## 7. Biến môi trường

File mẫu: `.env.example`

```text
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gps_attendance
JWT_SECRET=...
EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=...
REFRESH_TOKEN_EXPIRES_IN=14d
SEED_ADMIN_PASSWORD=...
SEED_LECTURER_PASSWORD=...
SEED_STUDENT_1_PASSWORD … SEED_STUDENT_5_PASSWORD
```

---

## 8. Docker và test

`Dockerfile`: multi-stage Node 20 Alpine, build shared + `prisma generate` + `nest build`, chạy production.

Compose (root): service `backend` cổng 3000, health `GET /health`, phụ thuộc Postgres healthy.

Unit: `src/**/*.spec.ts` (auth, geo, validation, health, request-id, roles).

E2E: `test/app.e2e-spec.ts`, `test/api-integration.e2e-spec.ts`, `test/complete-flow.e2e-spec.ts`, `test/jest-e2e.json`.

```bash
pnpm --filter @gps-attendance/attendance test
pnpm --filter @gps-attendance/attendance test:e2e
```

---

## 9. Chạy local

Từ root:

```bash
pnpm install
docker compose up postgres -d
# copy .env.example → .env, migrate, seed (dev)
pnpm dev:attendance
```

Trong package: `pnpm dev` (`nest start --watch`), `pnpm build`, `pnpm start`, `pnpm lint`.

`predev` ở package xóa tsbuildinfo. Root `predev:attendance` build shared trước.

---

## 10. Hạn chế thuộc backend

- CORS mở mọi origin
- Integrity token chưa verify Google/Apple
- Không logout/revoke JWT
- `unitFilter` / `tagFilter` chưa có bảng
- Fallback gán mọi SV khi mã không khớp
- `AttendanceSessionSeeder` và `response.interceptor` tồn tại nhưng không gắn runtime
- Mock repositories chỉ cho test, không phải đường production
