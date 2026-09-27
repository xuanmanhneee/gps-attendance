# GPS Attendance System

Hệ thống điểm danh GPS cho môi trường học tập. Monorepo **pnpm** gồm backend NestJS, dashboard React (giảng viên/admin) và app Expo (sinh viên). Persistence là **Prisma + PostgreSQL** — không còn store in-memory trên luồng chính.

Tài liệu hệ thống đầy đủ (API, DB, luồng check-in, hạn chế): [docs/SYSTEM.md](docs/SYSTEM.md).

Mỗi README chỉ mô tả **đối tượng của chính nó** (chi tiết từng file/module nằm ở README package):

| File | Đối tượng |
|---|---|
| [README.md](README.md) (file này) | Toàn monorepo: kiến trúc, Docker, env, scripts, liên kết |
| [server/attendance/README.md](server/attendance/README.md) | Backend NestJS — mọi module, API, Prisma, test |
| [client/admin-dashboard/README.md](client/admin-dashboard/README.md) | Dashboard web — mọi page, component, API client, nginx |
| [client/mobile-client/README.md](client/mobile-client/README.md) | App Expo — mọi route, GPS, leftover template |
| [packages/shared/README.md](packages/shared/README.md) | Contract TypeScript — types, error codes, HTTP client |

---

## 1. Mục tiêu sản phẩm

Mỗi phiên điểm danh có **tâm GPS**, **bán kính (mét)** và **cửa sổ thời gian**. Sinh viên chỉ điểm danh được khi đã được phân bổ vào phiên, phiên đang mở, và vượt các lớp chống gian lận.

| Vai trò | Ứng dụng | Việc chính |
|---|---|---|
| `student` | Mobile Expo | Đăng nhập, xem phiên được gán, check-in GPS, xem lịch sử |
| `lecturer` | Admin dashboard | Tạo / đóng / xóa phiên của mình, xem chi tiết sinh viên |
| `admin` | Admin dashboard | Toàn bộ phiên, danh sách user, phiên theo giảng viên |

**Đã có:** JWT access + refresh (tách login student / staff), CRUD phiên, phân bổ sinh viên, check-in GPS + anti-fraud, lịch sử điểm danh, health check, Docker Compose, Swagger, rate limit, logging.

**Chưa hoàn thiện:** verify Play Integrity / App Attest, logout/revoke token phía server, filter Unit/Tag (type có sẵn, chưa có bảng), CORS đang mở mọi origin.

---

## 2. Kiến trúc tổng thể

```text
                    ┌─────────────────────┐
                    │  packages/shared    │
                    │  types, DTO, HTTP,  │
                    │  error codes        │
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│ mobile-client    │  │ admin-dashboard │  │ server/attendance    │
│ Expo SDK 54      │  │ React 19 + Vite │  │ NestJS 11            │
│ Expo Go          │  │ :5173 (dev)     │  │ :3000                │
│ JWT user login   │  │ JWT admin login │  │ Swagger /api-docs    │
└────────┬─────────┘  └────────┬────────┘  └──────────┬───────────┘
         │ HTTP + Bearer JWT   │                      │
         └─────────────────────┴──────────────────────┘
                                          │ Prisma + pg
                                          ▼
                                 PostgreSQL 16
                                 (docker-compose)
```

Docker Compose (`docker-compose.yml`):

| Service | Cổng | Mô tả |
|---|---|---|
| `postgres` | `5432` | PostgreSQL 16, DB mặc định `gps_attendance` |
| `backend` | `3000` | API NestJS, health `GET /health` |
| `admin-dashboard` | `8080` | Nginx phục vụ bản build dashboard |

App mobile **không** nằm trong Compose. Chạy Expo trên máy/điện thoại, trỏ `EXPO_PUBLIC_API_URL` tới IP LAN của máy chạy API (không dùng `localhost` trên điện thoại thật).

---

## 3. Cấu trúc monorepo

```text
gps-attendance-main/
├── AGENTS.md                      # Mục lục quy ước cho agent/dev
├── README.md
├── package.json                   # Scripts gốc
├── pnpm-workspace.yaml            # server/*, client/*, packages/*
├── docker-compose.yml
├── client/
│   ├── admin-dashboard/           # React + Vite + Tailwind — lecturer/admin
│   └── mobile-client/             # Expo Router — sinh viên
├── packages/
│   └── shared/                    # @gps-attendance/shared — contract TS
├── server/
│   └── attendance/                # NestJS API + Prisma
└── docs/
    ├── SYSTEM.md                  # Tài liệu hệ thống (nguồn sự thật)
    ├── SYSTEM_OVERVIEW.md         # Trỏ sang SYSTEM.md
    ├── system-overview.md         # Bản cũ hơn SYSTEM.md
    ├── ARCHITECTURE.md            # Sơ đồ; một số đoạn scoring/in-memory lệch code
    ├── QUICK_REFERENCE.md
    ├── PHASE1_AUDIT.md / PHASE2_SECURITY.md / PHASE3_ATTENDANCE.md
    └── conventions/               # api-response, module-structure, auth-guards, naming (file nameing.md)
```

| Package | Tên npm | Vai trò |
|---|---|---|
| `server/attendance` | `@gps-attendance/attendance` | API, Prisma, JWT, validation GPS |
| `client/admin-dashboard` | `@gps-attendance/admin-dashboard` | Web giảng viên/admin |
| `client/mobile-client` | `@gps-attendance/mobile-client` | App sinh viên |
| `packages/shared` | `@gps-attendance/shared` | Types, DTO, error codes, HTTP client |

---

## 4. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | NestJS 11, Passport JWT/Local, Prisma 7, PostgreSQL 16, Winston, Swagger, Throttler |
| Dashboard | React 19, Vite, React Router 7, Tailwind 4, Axios, react-toastify, react-hook-form |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router, expo-location, expo-secure-store, expo-device |
| Shared | TypeScript workspace `@gps-attendance/shared` |
| Vận hành | Docker Compose, Dockerfile backend + dashboard (nginx) |
| Package manager | pnpm 11.x, Node `>= 20` |

---

## 5. Backend (`server/attendance`)

Bootstrap (`src/main.ts`): Winston JSON logger, CORS mở, `ValidationPipe` (whitelist + transform), `ApiExceptionFilter`, Swagger tại `http://localhost:3000/api-docs`, listen `0.0.0.0` cổng `PORT` hoặc `3000`.

`AppModule` import: Config (global), Throttler (5 req / 60s toàn cục), Database, Auth, Users, AttendanceSessions, Geo, AttendanceValidation, AttendanceCheckIn, Logging, Health.

- Middleware: `RequestIdMiddleware` mọi route.
- Guard toàn cục: `ThrottlerGuard`.
- Interceptor: `HttpLoggingInterceptor`.

### 5.1 Module

| Thư mục | Trách nhiệm |
|---|---|
| `auth/` | Login local + JWT + refresh; tách endpoint user/admin; `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()` |
| `account/` | Tài khoản đăng nhập (username / password bcrypt) |
| `users/` | Hồ sơ user, `UserFilterService` khi tạo session |
| `attendance-sessions/` | Tạo phiên + sinh record `absent`, đóng sớm, xóa (cascade), chi tiết kèm danh sách SV |
| `attendance-check-in/` | `POST .../check-in`, attempt (tối đa 3), chống trùng `deviceId` |
| `attendance-validation/` | Mock location, Haversine, integrity score |
| `attendance-record/` | Bản ghi điểm danh, `GET .../records/mine` |
| `geo/` | Haversine (R = 6_371_000 m), bán kính |
| `health/` | DB, migration, CPU/RAM — `GET /health` |
| `common/` | Prisma, filter exception, logging, request-id |

Persistence: **Prisma repository** trên PostgreSQL. Mock repository chỉ phục vụ unit test.

Nhiều controller khai báo **cả path cũ và `v0/`** để client gọi được cả hai.

### 5.2 Auth

Cùng `AuthService.validateUser` (bcrypt + Account + User). Payload JWT: `{ sub: userId, username, role }`. Trả `{ accessToken, refreshToken }`.

| Endpoint | Ai được phép |
|---|---|
| `POST /v0/user/auth/login` | Chỉ `student` (throttle 5/60s) |
| `POST /v0/admin/auth/login` | `lecturer` hoặc `admin` |
| `POST /v0/user/auth/refresh` | Refresh JWT sinh viên |
| `POST /v0/admin/auth/refresh` | Refresh JWT giảng viên/admin |

- Access: `JWT_SECRET`, hết hạn `EXPIRES_IN` (mặc định `1h`)
- Refresh: `REFRESH_TOKEN_SECRET`, hết hạn `REFRESH_TOKEN_EXPIRES_IN` (mặc định `14d`)

**Chưa có** `POST .../logout` phía server. Mobile vẫn gọi `/v0/user/auth/logout` — sẽ lỗi nếu dùng.

### 5.3 API chính

**Health:** `GET /health`, `GET /v0/health` — `ok | degraded | error`.

**Users** (`/users`):

| Method | Path | Role | Ý nghĩa |
|---|---|---|---|
| GET | `/me` | JWT | `{ code, role, fullname }` |
| GET | `/` | admin | Tất cả user |
| GET | `/:id` | admin | User theo id |

**Sessions** (`/attendance-sessions` và `/v0/attendance-sessions`):

| Method | Path | Role | Ý nghĩa |
|---|---|---|---|
| POST | `/` | admin, lecturer | Tạo phiên + record `absent` cho SV lọc được |
| GET | `/mine` | student | Phiên mình được gán |
| GET | `/created-by-me` | lecturer, admin | Phiên mình tạo |
| GET | `/created-by?userId=` | admin | Phiên theo giảng viên |
| GET | `/` | admin: tất cả; lecturer: của mình | Danh sách |
| DELETE | `/:id` | admin hoặc người tạo | Xóa (cascade record/attempt) |
| POST | `/:id/close` | admin hoặc người tạo | Đóng sớm (`closeAt = now`) |
| GET | `/by-user/:userId` | admin | Phiên theo user |
| GET | `/:id/detail` | admin, lecturer | Chi tiết + danh sách SV |
| GET | `/:id` | admin, lecturer | Thông tin cơ bản |

**Check-in / records:**

- `POST /attendance/check-in` (và `v0`) — JWT sinh viên, throttle 3/60s
- `GET /attendance/records/mine` (và `v0`) — lịch sử chi tiết của mình

**Gốc:** `GET /` — ping.

### 5.4 Trạng thái phiên (tính toán, không lưu DB)

```text
now < openAt              → pending
openAt ≤ now ≤ closeAt    → open
now > closeAt             → closed
```

Đóng sớm chỉ ghi `closeAt` = thời điểm hiện tại.

### 5.5 Phân bổ sinh viên khi tạo phiên

Body: `title`, `latitude`, `longitude`, `radius` (> 0 mét), `openAt`, `closeAt`, `participantCriteria`.

Hiện **chỉ dùng** `codeFilter.addCodes`:

- Không mã / chứa `ALL` / rỗng → mọi sinh viên
- Có mã → khớp `User.code` (không phân biệt hoa thường)
- Không khớp ai → **fallback mọi sinh viên** (có thể gán nhầm cả lớp)

Trong transaction: tạo `AttendanceSession` rồi `createMany` `AttendanceRecord` status `absent`. Unique `(sessionId, userId)`.

`unitFilter` / `tagFilter` có type trong shared nhưng **chưa có model Unit/Tag**.

---

## 6. Luồng check-in (nghiệp vụ cốt lõi)

```text
Mobile (GPS + device + integrity)
        │  POST /attendance/check-in  + Bearer JWT
        ▼
1. Session tồn tại?  không → 404 NOT_FOUND
2. status === 'open'? không → 400 SESSION_NOT_OPEN
3. Ghi AttendanceAttempt, đếm số lần thử
4. Có AttendanceRecord của user trong session?
      không → REJECTED USER_NOT_IN_SESSION
5. Record đã present? → 409 ALREADY_CHECKED_IN
6. Số attempt > 3? → REJECTED TOO_MANY_ATTEMPTS
7. Cùng deviceId đã điểm danh session này cho user khác?
      → REJECTED DUPLICATE_DEVICE
8. Validation GPS / mock / integrity
      REJECTED → không đổi record
      VALID hoặc REVIEW → markPresent
9. Đánh dấu device đã dùng + complete attempt
```

Payload:

```ts
{
  sessionId: number
  location: { latitude, longitude, accuracy, timestamp, isMockLocation }
  device: { deviceId, platform: 'android' | 'ios', model }
  integrity: { integrityToken: string | null }
}
```

Kết quả: `{ status: 'VALID' }` | `{ status: 'REVIEW', reasons }` | `{ status: 'REJECTED', reasons }`.

### Validation (`AttendanceValidationService`)

Trọng số: location **40**, mock **25**, integrity **35** (tổng 100).

1. `isMockLocation === true` → **REJECTED** `MOCK_LOCATION`.
2. `distance > radius`:
   - `distance ≤ radius + accuracy` → **REVIEW** `OUT_OF_RANGE` (vùng biên GPS)
   - xa hơn → **REJECTED** `OUT_OF_RANGE`
3. Trong bán kính: `score = mock×25 + location×40 + integrity×35`
   - Location: hệ số 1 nếu `distance + accuracy <= radius`, ngược lại 0
   - Integrity: có token → 0.7, không → 0.5 (**chưa verify Google/Apple**)
   - `score >= 80` và không reason → **VALID**
   - `score >= 60` → **REVIEW**
   - dưới 60 → **REJECTED** `LOW_CONFIDENCE_SCORE`

Mỗi lần gọi tạo 1 `AttendanceAttempt`. Quá 3 lần thử / user / session → từ chối. `deviceId` đã dùng cho session thì user khác không điểm danh được trên cùng máy.

---

## 7. Cơ sở dữ liệu

File: `server/attendance/prisma/schema.prisma`.

```text
Account 1 ── 1 User
User 1 ── N AttendanceSession (createdBy)
User 1 ── N AttendanceRecord
User 1 ── N AttendanceAttempt
AttendanceSession 1 ── N AttendanceRecord
AttendanceSession 1 ── N AttendanceAttempt
```

| Model | Bảng | Ý nghĩa |
|---|---|---|
| `Account` | `accounts` | username unique, password hash |
| `User` | `users` | `code` unique, `role`, `fullname`, FK account |
| `AttendanceSession` | `attendance_sessions` | tâm, bán kính, cửa sổ thời gian, người tạo |
| `AttendanceRecord` | `attendance_records` | unique session+user; status absent/present/late/excused |
| `AttendanceAttempt` | `attendance_attempts` | log mỗi lần thử; APPROVED/REVIEW/REJECTED; `reasons[]` |

Enum: `Role` (admin, lecturer, student), `AttendanceStatus`, `AttendanceAttemptResult`.

Seed **chỉ** chạy khi `NODE_ENV=development` (`prisma/seed.ts`). Username mẫu: `admin`, `quangtn` (lecturer), mã SV `2312686`… Mật khẩu lấy từ `SEED_*_PASSWORD` trong `.env`.

---

## 8. Shared package (`packages/shared`)

Export `types` + `api` qua `@gps-attendance/shared`.

- `ApiResponse<T>` = `{ success: true, data: T }` hoặc `{ success: false, code, message }`
- Error codes theo domain: auth, user, session, check-in, record, common
- Types: session, check-in, validation reason, user filter, device, login
- `createHttpClient` — dashboard dùng; mobile có HTTP riêng trong `src/api/api.ts`

Mọi thay đổi contract phải `pnpm build:shared` trước (client/server consume `dist/`).

---

## 9. Admin dashboard (`client/admin-dashboard`)

Stack: React 19, Vite, Tailwind 4, React Router, react-toastify, react-hook-form. Token lưu `localStorage` key `token`. API: `VITE_API_BASE_URL` (mặc định `http://localhost:3000`).

| Path | Màn hình |
|---|---|
| `/` `*` | redirect `/login` |
| `/login` | `POST /v0/admin/auth/login` |
| `/dashboard` | danh sách phiên, tạo / đóng / xóa |
| `/sessions/:id` | chi tiết phiên + sinh viên |

Thành phần: `LoginPage`, `DashboardPage`, `SessionDetailPage`, `ProtectedRoute`, `useAuth`, `useAttendanceSessions`, `SessionTable`, `CreateSessionModal`, `DashboardSidebar`, `ConfirmModal`, `Pagination`, `EmptyState`, `ErrorFallback`, `LoadingSkeleton`.

API client: `auth.api.ts`, `attendance-sessions.api.ts`, `users.api.ts`, `http.ts` (shared `createHttpClient`), `token.service.ts`.

Lecturer chỉ thấy phiên mình tạo; admin thấy tất cả. Docker: nginx cổng **8080**. Dev Vite: **5173**.

Dependency `xlsx` đã khai báo nhưng **chưa gắn** vào UI xuất Excel.

---

## 10. Mobile client (`client/mobile-client`)

Stack: Expo SDK 54, Expo Router, expo-location, expo-secure-store, expo-device.

| Route | Chức năng |
|---|---|
| `/` | Điều hướng theo auth |
| `/login` | `POST /v0/user/auth/login` |
| `/(tabs)/` | Check-in GPS, session `GET /v0/attendance-sessions/mine` |
| `/(tabs)/history` | `GET /attendance/records/mine` |
| `/(tabs)/profile` | Hồ sơ |

Context/service: `auth-context.tsx`, `token-storage.ts`, `device-id.ts`, `src/api/*`. Refresh: `POST /v0/user/auth/refresh`.

Cấu hình `.env`: `EXPO_PUBLIC_API_URL=http://<IP LAN>:3000`, `MOBILE_DEV_IP`.

UI check-in: `gps-status-card`, `attendance-modal`, `confirm-dialog`.

Lệch contract: chi tiết 1 record **chưa có API**; logout client gọi endpoint **chưa có trên server**.

---

## 11. Quan sát, bảo mật, vận hành

Đã có: JWT access + refresh, tách login student/staff, role guard, throttler, request-id + HTTP logging, health DB + migration, Docker, Swagger, unit/e2e trong `server/attendance`.

Hạn chế:

- CORS mở toàn bộ origin
- Integrity token chưa verify với Google/Apple
- Không logout/revoke token phía server
- `unitFilter` / `tagFilter` chưa có dữ liệu
- Fallback “mọi sinh viên” khi nhập sai mã
- Mobile logout / record-detail lệch API
- `docs/ARCHITECTURE.md` còn đoạn scoring/in-memory **lệch code** — lấy mục 6 README / `docs/SYSTEM.md` làm chuẩn

---

## 12. Cài đặt và chạy

### Yêu cầu

- Node.js `>= 20`
- pnpm `11.x` (`packageManager`: `pnpm@11.12.0`)
- PostgreSQL 16 (local hoặc Docker)
- Expo Go / máy thật để test GPS

### Cài đặt

```bash
cd gps-attendance-main
pnpm install
```

Sao chép env:

```bash
cp server/attendance/.env.example server/attendance/.env
cp client/admin-dashboard/.env.example client/admin-dashboard/.env
cp client/mobile-client/.env.example client/mobile-client/.env
```

Backend `.env` (xem `server/attendance/.env.example`):

```text
PORT, DATABASE_URL, JWT_SECRET, EXPIRES_IN,
REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN, MOBILE_DEV_IP,
SEED_ADMIN_PASSWORD, SEED_LECTURER_PASSWORD, SEED_STUDENT_*_PASSWORD
```

Chạy Postgres rồi migrate/seed (development):

```bash
docker compose up postgres -d
cd server/attendance
npx prisma migrate deploy   # hoặc migrate dev
# NODE_ENV=development + các SEED_* rồi prisma db seed
```

### Dev từng thành phần (từ root)

```bash
pnpm dev:attendance   # build shared rồi nest --watch  → :3000
pnpm dev:admin        # Vite dashboard                 → :5173
pnpm dev:mobile       # Expo
pnpm dev:shared       # watch build shared
```

Hỗ trợ mobile: `pnpm dev:mobile:clear`, `pnpm dev:mobile:offline`.

### Build / clean

```bash
pnpm build              # shared + attendance + admin
pnpm build:shared
pnpm build:attendance
pnpm build:admin
pnpm clean
```

Test backend:

```bash
pnpm --filter @gps-attendance/attendance test
pnpm --filter @gps-attendance/attendance test:e2e
```

### Docker toàn stack (trừ mobile)

```bash
docker compose up --build
```

- API: http://localhost:3000 — Swagger: http://localhost:3000/api-docs
- Dashboard: http://localhost:8080
- Postgres: localhost:5432

---

## 13. Scripts gốc

| Script | Việc |
|---|---|
| `dev:attendance` | Backend watch (`predev` build shared) |
| `dev:admin` | Dashboard Vite |
| `dev:mobile` | Expo |
| `dev:shared` | Watch compile shared |
| `build` / `build:*` | Build shared, API, dashboard |
| `clean` / `clean:*` | Xóa dist/cache |

---

## 14. Quy ước phát triển

`docs/conventions/`:

- `api-response.md` — `ApiResponse`
- `module-structure.md` — module NestJS, repository interface
- `auth-guards.md` — JWT, CurrentUser, User vs Account
- `naming.md` (file: `nameing.md`) — đặt tên

`AGENTS.md` là mục lục; convention trong `docs/conventions/` ưu tiên hơn suy đoán từ code cũ.

---

## 15. Tài liệu tham khảo

| File | Khi nào đọc |
|---|---|
| [docs/SYSTEM.md](docs/SYSTEM.md) | Mô tả hệ thống đầy đủ theo code hiện tại |
| [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) | Chạy nhanh + URL |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Sơ đồ; đối chiếu SYSTEM.md khi mâu thuẫn |
| [docs/conventions](docs/conventions) | Quy ước code |
| [server/attendance/README.md](server/attendance/README.md) | Toàn bộ backend |
| [client/admin-dashboard/README.md](client/admin-dashboard/README.md) | Toàn bộ dashboard |
| [client/mobile-client/README.md](client/mobile-client/README.md) | Toàn bộ mobile |
| [packages/shared/README.md](packages/shared/README.md) | Toàn bộ shared contract |

---

**Phiên bản README:** 3.0 (tháng 9/2026) — đối chiếu `server/attendance`, `client/*`, `packages/shared`, `prisma/schema.prisma`, `docker-compose.yml`.
