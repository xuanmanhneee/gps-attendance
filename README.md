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
| `redis` | `6379` | Redis In-memory cache & queue |
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
├── pnpm-workspace.yaml            # server/*, client/*, packages/*, presentation
├── docker-compose.yml
├── client/
│   ├── admin-dashboard/           # React + Vite + Tailwind — lecturer/admin
│   └── mobile-client/             # Expo Router — sinh viên
├── packages/
│   └── shared/                    # @gps-attendance/shared — contract TS
├── server/
│   └── attendance/                # NestJS API + Prisma
├── presentation/                  # Slidev slides trình bày đồ án
└── docs/
    ├── SYSTEM.md                  # Tài liệu hệ thống (nguồn sự thật)
    ├── SYSTEM_OVERVIEW.md         # Trỏ sang SYSTEM.md
    ├── ARCHITECTURE.md            # Sơ đồ
    ├── QUICK_REFERENCE.md
    └── conventions/               # api-response, module-structure, auth-guards, naming
```

| Package | Tên npm | Vai trò |
|---|---|---|
| `server/attendance` | `@gps-attendance/attendance` | API, Prisma, JWT, validation GPS |
| `client/admin-dashboard` | `@gps-attendance/admin-dashboard` | Web giảng viên/admin |
| `client/mobile-client` | `@gps-attendance/mobile-client` | App sinh viên |
| `packages/shared` | `@gps-attendance/shared` | Types, DTO, error codes, HTTP client |

Đây là **pnpm workspace monorepo** — các project (`server/attendance`, `admin-dashboard`, `mobile-client`) và `shared` được quản lý cùng nhau qua `pnpm-lock.yaml` duy nhất ở root.

---

## 4. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | NestJS 11, Passport JWT/Local, Prisma 7, PostgreSQL 16, Redis, Winston, Swagger, Throttler |
| Dashboard | React 19, Vite, React Router 7, Tailwind 4, Axios, react-toastify, react-hook-form |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router, expo-location, expo-secure-store, expo-device |
| Shared | TypeScript workspace `@gps-attendance/shared` |
| Vận hành | Docker Compose, Dockerfile backend + dashboard (nginx) |
| Package manager | pnpm 11.x, Node `>= 20` |

---

## 5. Backend (`server/attendance`)

Bootstrap (`src/main.ts`): Winston JSON logger, CORS mở, `ValidationPipe` (whitelist + transform), `ApiExceptionFilter`, Swagger tại `http://localhost:3000/api-docs`, listen `0.0.0.0` cổng `PORT` hoặc `3000`.

`AppModule` import: Config (global), Throttler (5 req / 60s toàn cục), Database, Auth, Users, Units, Tags, AttendanceSessions, Geo, AttendanceValidation, AttendanceCheckIn, Logging, Health, RedisModule.

- Middleware: `RequestIdMiddleware` mọi route.
- Guard toàn cục: `ThrottlerGuard`.
- Interceptor: `HttpLoggingInterceptor`.

### 5.1 Module

| Thư mục | Trách nhiệm |
|---|---|
| `auth/` | Login local + JWT + refresh; tách endpoint user/admin; `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()` |
| `account/` | Tài khoản đăng nhập (username / password bcrypt) |
| `users/` | Hồ sơ user, `UserFilterService` khi tạo session |
| `units/` | Quản lý khoa / đơn vị đào tạo |
| `tags/` | Quản lý tag / phân nhóm sinh viên |
| `attendance-sessions/` | Tạo phiên + sinh record `absent`, đóng sớm, xóa (cascade), chi tiết kèm danh sách SV |
| `attendance-check-in/` | `POST .../check-in`, attempt (tối đa 3), chống trùng `deviceId` |
| `attendance-validation/` | Mock location, Haversine, integrity score |
| `attendance-record/` | Bản ghi điểm danh, `GET .../records/mine` |
| `geo/` | Haversine (R = 6_371_000 m), bán kính |
| `health/` | DB, migration, CPU/RAM — `GET /health` |
| `common/` | Prisma, filter exception, logging, request-id |

### 5.2 Auth

Cùng `AuthService.validateUser` (bcrypt + Account + User). Payload JWT: `{ sub: userId, username, role }`. Trả `{ accessToken, refreshToken }`.

| Endpoint | Ai được phép |
|---|---|
| `POST /v0/user/auth/login` | Chỉ `student` (throttle 5/60s) |
| `POST /v0/admin/auth/login` | `lecturer` hoặc `admin` |
| `POST /v0/user/auth/refresh` | Refresh JWT sinh viên |
| `POST /v0/admin/auth/refresh` | Refresh JWT giảng viên/admin |

### 5.3 API chính

**Health:** `GET /health`, `GET /v0/health` — `ok | degraded | error`.

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

---

## 6. Cài đặt và chạy

### Yêu cầu

- Node.js `>= 20`
- pnpm `11.x` (`packageManager`: `pnpm@11.12.0`)
- PostgreSQL 16 (local hoặc Docker)
- Expo Go / máy thật để test GPS

### Cài đặt

Cài đặt duy nhất ở root bằng `pnpm install`:

```bash
pnpm install
```

Sao chép env:

```bash
cp server/attendance/.env.example server/attendance/.env
cp client/admin-dashboard/.env.example client/admin-dashboard/.env
cp client/mobile-client/.env.example client/mobile-client/.env
```

### Dev từng thành phần (từ root)

```bash
pnpm dev:attendance   # NestJS backend                 → :3000
pnpm dev:admin        # Vite dashboard                 → :5173
pnpm dev:mobile       # Expo
pnpm dev:shared       # watch build shared
```

### Build toàn bộ

```bash
pnpm build              # shared + attendance + admin
```
