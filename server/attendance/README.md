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
| Bảo vệ | `@nestjs/throttler` (120 req/60s global; login 5/60s; check-in 3/60s) |
| Log | Winston JSON, request-id, HTTP interceptor |
| Test | Jest unit (`*.spec.ts` trong `src/`), e2e (`test/`) |

---

## 3. Bootstrap và `AppModule`

`src/main.ts`:

- Logger: `WinstonJsonLogger`
- Global filter: `ApiExceptionFilter` → `{ success: false, code, message }`
- CORS allowlist: localhost defaults cộng các origin trong `CORS_ORIGIN` (comma-separated)
- `ValidationPipe` (`whitelist`, `transform`)
- Swagger: `http://localhost:3000/api-docs` (Bearer)
- Listen `0.0.0.0`, cổng `PORT` hoặc `3000`

`src/app.module.ts` import: Config, Throttler, Database/Prisma, Redis, Auth/Account, Users/Units/Tags, AttendanceSessions/Records/CheckIn/Validation, LocationRegistry, DeviceTrust, Logging và Health.

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
├── units/ / tags/
├── attendance-sessions/
├── attendance-check-in/
├── attendance-validation/
├── attendance-record/
├── location-registry/ / device-trust/
├── geo/
├── health/
├── prisma/ / redis/
└── common/
```

### 4.1 `auth/` — đăng nhập và JWT

| File | Việc |
|---|---|
| `auth.module.ts` | JwtModule async (`JWT_SECRET`, `EXPIRES_IN`), import Users + Account |
| `auth.service.ts` | validate bcrypt, `login()` access+refresh, `refresh()` |
| `controllers/user-auth.controller.ts` | Login/refresh/logout cho student |
| `controllers/admin-auth.controller.ts` | Login/refresh/logout cho lecturer/admin |
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

Logout endpoint tồn tại ở cả hai controller. `AuthService` dùng Redis blacklist để thu hồi token; client vẫn phải xóa token local.

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
| `user.controller.ts` | `GET/PATCH /v0/users/me`, `GET /v0/users` và `GET /v0/users/:id` (admin), test-filter endpoint |
| `users.service.ts` | CRUD đọc user |
| `user-filter.service.ts` | phân bổ sinh viên theo code/unit/tag criteria; đây là nguồn sự thật về include/exclude semantics |
| `user.model.ts` | domain User |
| `user.repository.ts` + `user.repository.token.ts` | interface + token |
| `repositories/prisma-user.repository.ts` | production |
| `repositories/mock-user.repository.ts` + `mocks/users.mock.ts` | **chỉ test** |

### 4.4 `attendance-sessions/` — phiên điểm danh

| File | Việc |
|---|---|
| `attendance-sessions.module.ts` | service, query, Prisma repo |
| `attendance-sessions.controller.ts` | Routes dưới `/v0/attendance-sessions` |
| `attendance-sessions.service.ts` | Tạo phiên từ lớp học phần/enrollment active; tạo records và history trong transaction; close/cancel/delete |
| `attendance-session-query.service.ts` | Teaching sections, roster/import/create course section, analytics, detail, review/audit |
| `attendance-session.model.ts` | domain + status computed `pending/open/closed` |
| `attendance-session.mapper.ts` | entity → `AttendanceSessionResponse` |
| `attendance-session.repository.ts` + `*.token.ts` | interface |
| `repositories/prisma-attendance-session.repository.ts` | production |
| `dto/create-attendance-session.dto.ts` | title, openAt/closeAt, courseSectionId/timetableSlotId; vị trí lấy từ Building Registry |
| `dto/check-location.dto.ts` | DTO vị trí (phụ) |
| `attendance-session.seeder.ts` | seed phiên test — **không đăng ký trong module**, không chạy lúc boot |

Route HTTP: xem mục 5.

### 4.5 `attendance-check-in/` — điểm danh GPS

| File | Việc |
|---|---|
| `attendance-check-in.module.ts` | wire store Prisma, AttemptCheck, DeviceCheck |
| `attendance-check-in.controller.ts` | `POST /v0/attendance/check-in`, role student, throttle 3/60s |
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
| `attendance-validation.service.ts` | Confidence weights: location 40, mock-location 25, integrity 35; kết quả VALID / REVIEW / REJECTED |
| `attendance-validation.types.ts` | input/result nội bộ |
| `checks/location.check.ts` | Haversine + accuracy vs radius |
| `checks/mock-location.check.ts` | `isMockLocation` |
| `checks/integrity.check.ts` | Heuristic parse payload/token và trả coefficient; **không verify chữ ký/provider Play Integrity hoặc App Attest** |
| `*.spec.ts` | unit test service + location |

### 4.7 `attendance-record/` — bản ghi điểm danh

| File | Việc |
|---|---|
| `attendance-record.module.ts` | Prisma repo + service + controller |
| `attendance-record.controller.ts` | `GET /v0/attendance/records/mine`, `summary`, `events/mine`, `:id` |
| `attendance-records.service.ts` | lịch sử chi tiết, `markPresent`, `getBySessionAndUser` |
| `attendance-record.model.ts` | domain record |
| `attendance-record.repository.ts` + `*.token.ts` | interface |
| `repositories/prisma-attendance-record.repository.ts` | production |
| `repositories/mock-attendance-record.repository.ts` | **chỉ test** |

`GET /v0/attendance/records/:id` trả record thuộc về user hiện tại; controller kiểm tra quyền truy cập.

### 4.8 `geo/` — khoảng cách

| File | Việc |
|---|---|
| `geo.module.ts` | export GeoService |
| `geo.service.ts` | Haversine, R = 6_371_000 m, `isWithinRadius` |
| `geo.service.spec.ts` | unit test |

### 4.9 `health/` — sức khỏe hệ thống

| File | Việc |
|---|---|
| `health.controller.ts` | `GET /v0/health`; 200 hoặc 503 |
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

Các controller versioned dùng prefix `/v0`; riêng ping root là `/`. Các API có JWT cần `Authorization: Bearer <accessToken>` trừ login/refresh và health.

### Auth

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/v0/user/auth/login` | student |
| POST | `/v0/user/auth/refresh` | body `refreshToken` |
| POST | `/v0/user/auth/logout` | student, revoke token |
| POST | `/v0/admin/auth/login` | lecturer/admin |
| POST | `/v0/admin/auth/refresh` | |
| POST | `/v0/admin/auth/logout` | lecturer/admin, revoke token |

Trả `{ accessToken, refreshToken }`. Access: `JWT_SECRET` / `EXPIRES_IN` (mặc định 1h). Refresh: `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_EXPIRES_IN` (mặc định 14d).

### Health / ping

| Method | Path |
|---|---|
| GET | `/` | Liveness/ping |
| GET | `/v0/health` | DB/migration/resource health; có thể trả 503 |

### Users — `/v0/users`

| Method | Path | Quyền | Mục đích |
|---|---|---|---|
| GET | `/me` | JWT | Hồ sơ hiện tại |
| PATCH | `/me` | JWT | Cập nhật profile hiện tại |
| GET | `/` | admin | Danh sách users |
| GET | `/:id` | admin | User theo id |
| POST | `/test-filter` | hiện chưa có guard | Test `UserFilterService`; không dùng như endpoint production công khai |

### Attendance sessions — `/v0/attendance-sessions`

| Method | Path | Quyền | Mục đích |
|---|---|---|---|
| POST | `/` | lecturer/admin | Tạo phiên từ lớp học phần có enrollment active, thời khóa biểu và Building đã xác minh |
| GET | `/me` | student | Phiên/attendance của sinh viên hiện tại |
| GET | `/mine` | student | Sessions được gán |
| GET | `/teaching-sections` | lecturer/admin | Lớp được phân công; admin thấy toàn bộ |
| GET | `/sections/creation-options` | admin | Lecturer, room, course cho form |
| POST | `/courses/import` | admin | Nhập danh mục mã học phần |
| POST | `/sections` | admin | Tạo course/term nếu cần và tạo lớp học phần |
| GET | `/sections/:sectionId/roster` | admin hoặc giảng viên được phân công | Roster active |
| POST | `/sections/:sectionId/roster/import` | admin | Import hồ sơ, tạo tài khoản student thiếu nếu đủ dữ liệu và ghi danh |
| POST | `/sections/:sectionId/timetable` | admin | Thêm lịch lặp theo Thứ hoặc buổi ngày cụ thể, giờ/phòng; không cho trùng ca |
| PATCH | `/sections/:sectionId/timetable/:slotId` | admin | Cập nhật ca học |
| DELETE | `/sections/:sectionId/timetable/:slotId` | admin | Xóa ca chưa được dùng trong session |
| GET | `/analytics` | lecturer/admin | Thống kê chuyên cần |
| GET | `/created-by-me` | lecturer/admin | Phiên do user hiện tại tạo |
| GET | `/created-by?userId=` | admin | Phiên theo người tạo |
| GET | `/` | lecturer/admin | Danh sách phiên; lecturer bị giới hạn theo user |
| POST | `/:id/attempts/:attemptId/review` | lecturer/admin | Duyệt/từ chối attempt |
| DELETE | `/:id` | lecturer/admin, ownership được kiểm tra | Xóa phiên và dữ liệu liên quan |
| POST | `/:id/close` | lecturer/admin, ownership được kiểm tra | Đóng phiên |
| PATCH | `/:id/cancel` | lecturer/admin, ownership được kiểm tra | Hủy phiên |

Luồng chuẩn bị lớp để tạo phiên: admin tạo lớp với ngày bắt đầu/kết thúc học kỳ, phân công giảng viên, nhập roster sinh viên đã có tài khoản, sau đó khai báo lịch lặp theo Thứ hoặc buổi học ngày cụ thể cùng giờ/phòng. Ngày buổi học cụ thể phải nằm trong học kỳ; phiên tạo từ buổi cụ thể phải mở đúng ngày đó. Lịch lặp theo tuần vẫn yêu cầu ngày mở phiên khớp Thứ đã chọn. Backend từ chối tạo phiên nếu lớp chưa có roster active hoặc chưa có thời khóa biểu. Giảng viên chỉ thấy lớp được phân công; admin thấy tất cả lớp.

Import roster nhận các cột `Mã số SV`, `User` (tùy chọn), `Họ lót`, `Tên`, `Ngày sinh`, `Giới tính`, `Lớp` (cũng nhận alias tiếng Anh). Lớp được lưu vào `cohort`; ngày sinh chuẩn hóa về `YYYY-MM-DD`. Mã sinh viên là khóa nhận diện; tài khoản student mới được tạo khi có họ tên, dùng MSSV làm username nếu file không có `User`, và dùng MSSV làm mật khẩu. Khi nhập hồ sơ chi tiết, mật khẩu các tài khoản sinh viên hợp lệ đã có trong danh sách cũng được đặt lại thành MSSV; username hiện có không đổi. Dạng yêu cầu cũ chỉ gửi mã sinh viên để ghi danh không đặt lại mật khẩu. Mật khẩu được hash bằng bcrypt; không trả mật khẩu/hash trong response. Trường `Mật Khẩu` từ file cũ được bỏ qua.
| GET | `/by-user/:userId` | admin | Sessions theo sinh viên |
| GET | `/:id/detail` | lecturer/admin | Chi tiết participants, attempts, history |
| GET | `/:id` | lecturer/admin | Thông tin phiên |
| POST | `/:id/lecturer-location-verification` | lecturer/admin | Lưu GPS evidence của giảng viên |

Status `SessionStatus` được tính từ thời gian phiên và trạng thái hủy; xem model/service để biết quy tắc hiện hành. Tạo phiên snapshot các enrollment `active` thành attendance records `absent` và history events trong cùng transaction.

### Check-in và attendance records

| Method | Path | Quyền | Mục đích |
|---|---|---|---|
| POST | `/v0/attendance/check-in` | student; limit 3/phút | Gửi GPS/device/integrity evidence |
| GET | `/v0/attendance/records/mine` | JWT | Lịch sử điểm danh |
| GET | `/v0/attendance/records/summary` | JWT | Summary hiện tại |
| GET | `/v0/attendance/records/events/mine` | JWT | History events |
| GET | `/v0/attendance/records/:id` | JWT + ownership | Một attendance record |

Validation trả kết quả `VALID`, `REVIEW` hoặc `REJECTED` cùng reasons. `REVIEW` có thể được lecturer/admin xử lý qua route review session.

### Location, device và các domain phụ

| Method | Path | Quyền | Mục đích |
|---|---|---|---|
| GET | `/v0/location-registry/campuses` | admin/lecturer + JWT | Danh sách khuôn viên để đăng ký tòa nhà |
| GET | `/v0/location-registry/buildings?includeInactive=` | admin/lecturer + JWT | Building registry |
| POST | `/v0/location-registry/buildings` | admin | Đăng ký tòa nhà với mã, tên và tọa độ; mặc định chưa xác minh, radius/accuracy để trống đến sau field test |
| PATCH | `/v0/location-registry/buildings/:id` | admin | Tọa độ/radius/accuracy/verify/status |
| GET | `/v0/location-registry/rooms?includeInactive=` | admin/lecturer + JWT | Rooms và liên kết Building |
| POST | `/v0/location-registry/rooms` | admin | Tạo phòng và link Building |
| PATCH | `/v0/location-registry/rooms/:id` | admin | Cập nhật room/Building link |
| PATCH | `/v0/admin/devices/:id/trust` | admin | Trust/block thiết bị |
| POST | `/v0/accounts` | hiện không có guard | Tạo user/account |
| GET | `/v0/accounts/:id` | hiện không có guard | Đọc account an toàn (không trả password hash) |
| GET/POST/PATCH | `/units`, `/units/tree`, `/units/:id` | controller hiện không gắn guard | CRUD/tree đơn vị |
| GET/POST/DELETE | `/tags` và các route `/:tagId/users/:userId` | JWT, ownership trong service | Quản lý tag và gán user |

`/v0/accounts` và `/units` hiện không có auth guard ở controller; cần bảo vệ trước khi expose ra môi trường không tin cậy. `tags` yêu cầu JWT nhưng không dùng `RolesGuard`.

---

## 6. Database (Prisma)

`prisma/schema.prisma` — PostgreSQL. Schema khai báo Account/User, Unit/Tag, Course/AcademicTerm/CourseSection/ClassEnrollment/TimetableSlot/Room/Building, AttendanceSession/Record/Attempt/HistoryEvent, LecturerLocationVerification, Notification/NotificationState, PushToken, RegisteredDevice, DeviceIntegrityCheck và AuditLog.

| Model | Bảng | Ý nghĩa |
|---|---|---|
| `Account` | `accounts` | username unique, password hash |
| `User` | `users` | code unique, role, fullname, 1-1 Account |
| `CourseSection` / `ClassEnrollment` | `course_sections` / `class_enrollments` | Lớp học phần và enrollment theo status |
| `AttendanceSession` | `attendance_sessions` | thời gian, Building/room/timetable và GPS snapshot |
| `AttendanceRecord` | `attendance_records` | unique (sessionId, userId); absent/present/late/excused |
| `AttendanceAttempt` | `attendance_attempts` | mỗi lần thử; APPROVED/REVIEW/REJECTED; reasons[] |
| `AttendanceHistoryEvent` / `AuditLog` | `attendance_history_events` / `audit_logs` | timeline nghiệp vụ và audit |
| `Building` / `Room` | `buildings` / `rooms` | Location Registry và phòng học |
| Device models | `registered_devices`, `device_integrity_checks`, `push_tokens` | device trust/integrity/push identity |

Các enum gồm role, session/enrollment/attendance status, attempt result, location, device trust, notification và audit event. Xem schema làm nguồn sự thật về field, relation, index và enum.

Migration tuần tự nằm trong `prisma/migrations/`; không sửa migration đã áp dụng. Tạo migration mới khi đổi schema.

Migration `20261014000300_make_user_unit_optional` đồng bộ `users.unit_id` trong PostgreSQL với Prisma schema hiện tại: tài khoản mẫu và sinh viên có thể chưa được gán đơn vị. Sau khi lấy thay đổi này, chạy `pnpm.cmd --filter @gps-attendance/attendance exec prisma migrate deploy` trước khi chạy seed.

`prisma/seed.ts`: chỉ dùng cho development; tạo/cập nhật demo accounts/users và 10 lớp học phần `SAMPLE101`–`SAMPLE110`, mỗi lớp có roster từ các sinh viên seed, giảng viên `GV001`, phòng mẫu và một ca thời khóa biểu. Seed có thể chạy lại; các tòa nhà/phòng mẫu vẫn chưa được xác minh GPS, nên cần field test trước khi dùng tạo phiên điểm danh. Từ thư mục gốc monorepo chạy `pnpm seed:attendance`, hoặc từ `server/attendance` chạy `pnpm exec prisma db seed`. Tài khoản mẫu development: `admin` / `123456`; giảng viên `quangtn` / `123456`; mật khẩu mỗi sinh viên mẫu luôn là chính MSSV của tài khoản đó. `SEED_ADMIN_PASSWORD` và `SEED_LECTURER_PASSWORD` có thể được đặt trong `server/attendance/.env`; seed ghi lại mật khẩu sinh viên mẫu theo MSSV. Chạy lại seed để cập nhật database hiện tại. Không dùng các mật khẩu mẫu này ngoài development và không đưa credentials thật vào tài liệu/commit.

---

## 7. Biến môi trường

File mẫu: `.env.example`

```text
PORT=3000
CORS_ORIGIN=comma,separated,origins
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/gps_attendance
JWT_SECRET=<random-secret>
EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=<different-random-secret>
REFRESH_TOKEN_EXPIRES_IN=14d
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SEED_ADMIN_PASSWORD / SEED_LECTURER_PASSWORD
```

Không commit giá trị thật. `prisma/seed.ts` chỉ cho phép chạy `NODE_ENV=development`; mật khẩu seed lấy từ `SEED_*_PASSWORD`.

---

## 8. Docker và test

`Dockerfile`: multi-stage Node 20 Alpine, build shared + `prisma generate` + `nest build`, chạy production.

Compose (root): PostgreSQL `5432`, Redis `6379`, backend `3000`, dashboard `8080`. Backend code cung cấp `GET /v0/health`; `docker-compose.yml` hiện đang healthcheck `/health`, vì vậy cần đồng bộ cấu hình này nếu container bị đánh unhealthy.

Unit: `src/**/*.spec.ts` (auth, geo, validation, health, request-id, roles).

E2E: `test/app.e2e-spec.ts`, `test/api-integration.e2e-spec.ts`, `test/complete-flow.e2e-spec.ts`, `test/jest-e2e.json`.

```bash
pnpm --filter @gps-attendance/attendance test
pnpm --filter @gps-attendance/attendance test:e2e
```

E2E dùng `test/jest-e2e.json`; cần database/test environment phù hợp.

---

## 9. Chạy local

Từ root:

```bash
pnpm install
docker compose up -d postgres redis
# tạo server/attendance/.env từ .env.example và điền local secrets
cd server/attendance
pnpm exec prisma migrate dev
pnpm exec prisma db seed
cd ../..
pnpm build:shared
pnpm --filter @gps-attendance/attendance dev
```

Để dùng script root có ngrok: `pnpm dev:attendance` (cần cài/xác thực ngrok; script mở tunnel rồi chạy Nest). Trên mạng LAN/local có thể dùng package command ở trên. Script package: `dev`, `debug`, `build`, `start`, `clean`, `lint`, `test`, `test:watch`, `test:cov`, `test:e2e`.

`predev` xóa tsbuildinfo; root `predev:attendance` build shared trước.

### Khắc phục lỗi database `gps_attendance` chưa tồn tại

Nếu PostgreSQL đang chạy nhưng backend báo database `gps_attendance` không tồn tại, hãy kết nối vào database quản trị `postgres` trên đúng máy chủ/port được cấu hình trong `DATABASE_URL` rồi tạo database rỗng:

```sql
CREATE DATABASE gps_attendance;
```

Không chạy lệnh này nếu database đã tồn tại; không dùng `migrate reset` để khắc phục lỗi thiếu database. Sau khi tạo, kiểm tra `DATABASE_URL` trong `server/attendance/.env` trỏ đến database vừa tạo, rồi chạy từ root:

```powershell
pnpm.cmd --filter @gps-attendance/attendance exec prisma migrate deploy
```

Nếu dùng PostgreSQL của Docker Compose lần đầu, `docker compose up -d postgres` tự tạo database theo `POSTGRES_DB` (mặc định `gps_attendance`). Nếu volume PostgreSQL đã được khởi tạo trước đó, thay đổi `POSTGRES_DB` trong môi trường Compose không tự tạo thêm database; hãy tạo database thủ công như trên. Không xóa volume PostgreSQL để xử lý lỗi này vì thao tác đó có thể xóa dữ liệu khác.

---

## 10. Security và giới hạn hiện tại

- Global rate limit: 120 request/phút; login 5/phút; check-in 3/phút. Các mức này cấu hình trong `src/app.module.ts` và controller tương ứng.
- CORS mặc định giới hạn localhost; thêm origin bằng `CORS_ORIGIN`. Không dùng wildcard cho credentialed production traffic.
- GPS/device integrity pipeline có scoring/review; presence of an integrity token không đồng nghĩa với xác thực trực tiếp qua Google Play Integrity hoặc Apple App Attest provider.
- `/v0/users/test-filter` hiện không có auth guard; chỉ dùng trong môi trường tin cậy và cần bảo vệ/gỡ nếu không phục vụ production.
- `src/prisma/prisma.seed.ts` là seed flow khác, không phải seed được `prisma.config.ts` cấu hình; seed chuẩn hiện tại là `prisma/seed.ts`.
- `AttendanceSessionSeeder` và response interceptor tồn tại trong source nhưng không được gắn runtime trong `AppModule`.
- Không chạy `prisma migrate reset` trên dữ liệu cần giữ; không sửa migration đã deploy.
