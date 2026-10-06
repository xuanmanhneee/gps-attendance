# GPS Attendance System

Hệ thống điểm danh GPS cho môi trường học tập. Monorepo **pnpm** gồm backend NestJS, dashboard React (giảng viên/admin) và app Expo (sinh viên). Persistence là **Prisma + PostgreSQL** — không còn store in-memory trên luồng chính.

Tài liệu hệ thống đầy đủ (API, DB, luồng check-in, hạn chế): [docs/SYSTEM.md](docs/SYSTEM.md).

Mỗi README chỉ mô tả **đối tượng của chính nó** (chi tiết từng file/module nằm ở README package):

| File | Đối tượng |
|---|---|
| [README.md](README.md) (file này) | Toàn monorepo: kiến trúc, Docker, env, scripts, liên kết |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Cấu trúc dự án đầy đủ: monorepo, package, module và luồng dữ liệu |
| [server/attendance/README.md](server/attendance/README.md) | Backend NestJS — mọi module, API, Prisma, test |
| [client/admin-dashboard/README.md](client/admin-dashboard/README.md) | Dashboard web — mọi page, component, API client, nginx |
| [client/mobile-client/README.md](client/mobile-client/README.md) | App Expo — mọi route, GPS, leftover template |
| [packages/shared/README.md](packages/shared/README.md) | Contract TypeScript — types, error codes, HTTP client |
| [presentation/README.md](presentation/README.md) | Slidev deck; workspace độc lập, không thuộc pnpm workspace root |
| [server/attendance/src/prisma/README.md](server/attendance/src/prisma/README.md) | Quy trình migration và seed của backend |

---

## 1. Mục tiêu sản phẩm

Mỗi phiên điểm danh có **tâm GPS**, **bán kính (mét)** và **cửa sổ thời gian**. Sinh viên chỉ điểm danh được khi đã được phân bổ vào phiên, phiên đang mở, và vượt các lớp chống gian lận.

| Vai trò | Ứng dụng | Việc chính |
|---|---|---|
| `student` | Mobile Expo | Đăng nhập, xem phiên/lịch, check-in GPS, xem lịch sử và hồ sơ |
| `lecturer` | Admin dashboard | Tạo / đóng / xóa phiên của mình, xem chi tiết sinh viên |
| `admin` | Admin dashboard | Toàn bộ phiên, danh sách user, phiên theo giảng viên |

**Hệ thống đồng bộ hợp nhất:**
- JWT access + refresh, tách biệt cổng login student / admin-lecturer.
- Đăng xuất & thu hồi token phía server bằng Redis blacklist (`POST /v0/user/auth/logout`, `POST /v0/admin/auth/logout`).
- CRUD phiên điểm danh, đóng sớm, xóa cascade.
- Phân bổ sinh viên linh hoạt theo Mã SV, Đơn vị đa cấp (`Unit`) và Thẻ (`Tag`).
- Điểm danh GPS, kiểm tra mock location, Haversine geofencing và đánh giá integrity payload (không đồng nghĩa với xác minh trực tiếp qua provider Google/Apple).
- Giới hạn 3 lần thử thất bại, cơ chế khóa chống trùng lặp thiết bị (`deviceId`).
- Lịch sử, tổng quan và chi tiết bản ghi điểm danh (`/v0/attendance/records/*`).
- Quản lý học phần/lớp học phần, roster, nhập mã học phần và enrollment sinh viên.
- Location Registry, cấu hình Building GPS, xác minh địa điểm và quản lý trust của thiết bị.
- Xuất danh sách điểm danh ra định dạng Excel (CSV UTF-8 BOM).
- Cấu hình CORS Whitelist linh hoạt, Health check, Docker Compose, Swagger, Winston logging.

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
| `redis` | `6379` | Redis dùng cho blacklist/revoke token và backend state |
| `backend` | `3000` | API NestJS; health route hiện tại là `GET /v0/health` |
| `admin-dashboard` | `8080` | Nginx phục vụ bản build dashboard |

App mobile **không** nằm trong Compose. Chạy Expo trên máy/điện thoại, đặt `EXPO_PUBLIC_API_URL` tới IP LAN hoặc HTTPS tunnel của máy chạy API (không dùng `localhost` trên điện thoại thật). Khi biến để trống, app thử suy ra host từ Expo Metro và dùng port `3000`.

> **Compose healthcheck cần lưu ý:** backend khai báo `/v0/health`, còn `docker-compose.yml` hiện probe `/health`. Nếu container backend báo unhealthy dù API chạy, kiểm tra/đồng bộ đường dẫn healthcheck trong Compose.

### Kết nối qua mạng khác bằng ngrok

Cài ngrok, đăng nhập và chạy backend ở cổng `3000`, sau đó chạy từ root:

```powershell
pnpm.cmd dev:ngrok
```

Script tự lấy HTTPS URL từ ngrok và cập nhật `client/admin-dashboard/.env` cùng `client/mobile-client/.env`. Để URL không đổi giữa các lần chạy, dùng static domain:

```powershell
$env:NGROK_DOMAIN = 'your-static-domain.ngrok-free.app'
pnpm.cmd dev:ngrok
```

Sau đó khởi động lại dashboard/Expo. Ngrok chỉ giải quyết địa chỉ mạng; lỗi `401 Invalid credentials` vẫn cần username/mật khẩu đúng.

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
├── presentation/                  # Slidev, pnpm workspace/lockfile riêng
└── docs/
    ├── SYSTEM.md                  # Tài liệu hệ thống (nguồn sự thật)
    ├── SYSTEM_OVERVIEW.md         # Trỏ sang SYSTEM.md
    ├── ARCHITECTURE.md            # Sơ đồ
    ├── QUICK_REFERENCE.md
    └── conventions/               # api-response, module-structure, auth-guards, naming convention
```

| Package | Tên npm | Vai trò |
|---|---|---|
| `server/attendance` | `@gps-attendance/attendance` | API, Prisma, JWT, validation GPS |
| `client/admin-dashboard` | `@gps-attendance/admin-dashboard` | Web giảng viên/admin |
| `client/mobile-client` | `@gps-attendance/mobile-client` | App sinh viên |
| `packages/shared` | `@gps-attendance/shared` | Types, DTO, error codes, HTTP client |

Backend, clients và shared thuộc pnpm workspace root, dùng root `pnpm-lock.yaml`. `presentation/` là workspace Slidev tách riêng, có `pnpm-workspace.yaml` và lockfile riêng; cài dependency của nó từ thư mục presentation.

---

## 4. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | NestJS 11, Passport JWT/Local, Prisma 7, PostgreSQL 16, Redis, Winston, Swagger, Throttler |
| Dashboard | React 19, Vite, React Router 7, Tailwind 4, shared fetch client, react-toastify, react-hook-form |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router, expo-location, expo-secure-store, expo-device |
| Shared | TypeScript workspace `@gps-attendance/shared` |
| Vận hành | Docker Compose, Dockerfile backend + dashboard (nginx) |
| Package manager | pnpm 11.x, Node `>= 20` |

---

## 5. Backend (`server/attendance`)

Bootstrap (`src/main.ts`): Winston JSON logger, CORS allowlist (localhost defaults cộng `CORS_ORIGIN`), `ValidationPipe` (whitelist + transform), `ApiExceptionFilter`, Swagger tại `http://localhost:3000/api-docs`, listen `0.0.0.0` cổng `PORT` hoặc `3000`.

`AppModule` import các module auth/account, users/units/tags, attendance records/sessions/check-in/validation, location registry, device trust, Prisma/Redis, logging và health. Rate-limit mặc định là 120 request/phút; login và check-in có giới hạn riêng thấp hơn.

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
| `attendance-sessions/` | Tạo phiên từ section/enrollment active, quản lý phiên, review/audit, course-section và roster |
| `attendance-check-in/` | `POST .../check-in`, attempt (tối đa 3), chống trùng `deviceId` |
| `attendance-validation/` | Mock location, Haversine, integrity score |
| `attendance-record/` | Bản ghi điểm danh, `GET .../records/mine` |
| `geo/` | Haversine (R = 6_371_000 m), bán kính |
| `health/` | DB, migration, CPU/RAM — `GET /v0/health` |
| `common/` | Prisma, filter exception, logging, request-id |

### 5.2 Auth

Cùng `AuthService.validateUser` (bcrypt + Account + User). Payload JWT: `{ sub: userId, username, role }`. Trả `{ accessToken, refreshToken }`.

| Endpoint | Ai được phép |
|---|---|
| `POST /v0/user/auth/login` | Chỉ `student` (throttle 5/60s) |
| `POST /v0/admin/auth/login` | `lecturer` hoặc `admin` |
| `POST /v0/user/auth/refresh` | Refresh JWT sinh viên |
| `POST /v0/admin/auth/refresh` | Refresh JWT giảng viên/admin |

### 5.3 API và tài liệu API

API được version dưới `/v0`. Các domain chính gồm auth, users, attendance sessions/records, check-in, course sections/rosters, location registry và device trust. Endpoint, role guard, request/response chi tiết được liệt kê trong [README backend](server/attendance/README.md); Swagger tại `http://localhost:3000/api-docs` là nguồn khám phá schema/runtime hiện hành.

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

Sao chép các file mẫu và điền giá trị local phù hợp (không commit `.env` hoặc secret). Trong PowerShell Windows có thể dùng `Copy-Item` thay cho `cp`:

```bash
cp server/attendance/.env.example server/attendance/.env
cp client/admin-dashboard/.env.example client/admin-dashboard/.env
cp client/mobile-client/.env.example client/mobile-client/.env
```

```powershell
Copy-Item server/attendance/.env.example server/attendance/.env
Copy-Item client/admin-dashboard/.env.example client/admin-dashboard/.env
Copy-Item client/mobile-client/.env.example client/mobile-client/.env
```

### Chạy dev (từ root)

```bash
pnpm dev:attendance   # build shared, mở/ngắt với ngrok, sau đó NestJS → :3000
pnpm dev:admin        # build shared + Vite dashboard → :5173
pnpm dev:mobile       # build shared + Expo
pnpm dev:shared       # watch build shared
```

`pnpm dev:attendance` gọi PowerShell script `scripts/start-ngrok.ps1`, cần cài ngrok và xác thực tài khoản. Nếu chỉ cần backend LAN/local, chạy `pnpm build:shared` rồi `pnpm --filter @gps-attendance/attendance dev`.

### Build toàn bộ

```bash
pnpm build              # shared + attendance + admin
pnpm build:attendance   # shared + backend
pnpm build:admin        # shared + dashboard
```

Mobile chạy qua Expo, không được đưa vào root production build. Presentation có lệnh riêng trong [presentation README](presentation/README.md).

### Database và kiểm thử

Từ root, xem [Prisma README](server/attendance/src/prisma/README.md) để chạy `migrate status/dev/deploy` và seed đúng package. Không dùng `migrate reset` trên database có dữ liệu cần giữ.

```bash
pnpm --filter @gps-attendance/attendance test
pnpm --filter @gps-attendance/attendance test:e2e
pnpm --filter @gps-attendance/admin-dashboard build
```

### Cấu hình an toàn

- Thay mọi secret mẫu bằng giá trị ngẫu nhiên riêng trước khi deploy.
- Không commit `.env`, access token, khóa ký JWT hoặc mật khẩu cơ sở dữ liệu.
- CORS chỉ cho phép origin mặc định và các origin khai báo trong `CORS_ORIGIN`.
- PostgreSQL/Redis Compose dùng named volumes; không xóa volume nếu cần giữ dữ liệu.
