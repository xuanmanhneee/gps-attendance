# Tài liệu hệ thống GPS Attendance

Cập nhật theo mã nguồn tại `gps-attendance-main` (tháng 9/2026). Đây là tài liệu mô tả **toàn bộ hệ thống đang chạy**, không phải kế hoạch cũ.

---

## 1. Mục tiêu sản phẩm

Hệ thống điểm danh theo vị trí GPS cho môi trường học tập:

| Vai trò | Ứng dụng | Việc chính |
|---|---|---|
| Sinh viên (`student`) | Mobile Expo | Đăng nhập, xem phiên được gán, check-in GPS, xem lịch sử |
| Giảng viên (`lecturer`) | Admin dashboard (web) | Tạo/đóng/xóa phiên của mình, xem chi tiết sinh viên |
| Quản trị (`admin`) | Admin dashboard (web) | Toàn bộ phiên, danh sách user, phiên theo giảng viên |

Mỗi phiên điểm danh có **tâm GPS + bán kính (mét) + cửa sổ thời gian**. Sinh viên chỉ điểm danh được khi:

1. Đã được **phân bổ** vào phiên (có bản ghi `AttendanceRecord` sẵn, mặc định `absent`).
2. Phiên đang **open** (thời gian hiện tại nằm giữa `openAt` và `closeAt`).
3. Vượt các lớp chống gian lận (số lần thử, trùng thiết bị, mock location, khoảng cách, điểm tin cậy).

---

## 2. Kiến trúc tổng thể

Monorepo **pnpm** (`pnpm-workspace.yaml`: `server/*`, `client/*`, `packages/*`).

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
│ Expo / RN        │  │ React 19 + Vite │  │ NestJS 11            │
│ : Expo Go        │  │ :5173 (dev)     │  │ :3000                │
│ JWT user login   │  │ JWT admin login │  │ Swagger /api-docs    │
└────────┬─────────┘  └────────┬────────┘  └──────────┬───────────┘
         │ HTTP + Bearer JWT   │                      │
         └─────────────────────┴──────────────────────┘
                                          │ Prisma + pg
                                          ▼
                                 PostgreSQL 16
                                 (docker-compose)
```

Luồng triển khai Docker (`docker-compose.yml`):

- `postgres` — cổng `5432`, DB mặc định `gps_attendance`
- `backend` — cổng `3000`, health `GET /health`
- `admin-dashboard` — cổng `8080` (nginx phục vụ bản build)

Mobile **không** nằm trong compose; chạy Expo trên máy/điện thoại, trỏ `EXPO_PUBLIC_API_URL` tới IP LAN của máy chạy API.

---

## 3. Thành phần workspace

| Package | Tên npm | Vai trò |
|---|---|---|
| `server/attendance` | `@gps-attendance/attendance` | API NestJS, Prisma, JWT, validation GPS |
| `client/admin-dashboard` | `@gps-attendance/admin-dashboard` | Web giảng viên/admin |
| `client/mobile-client` | `@gps-attendance/mobile-client` | App sinh viên |
| `packages/shared` | `@gps-attendance/shared` | Contract TypeScript dùng chung |

Lệnh gốc (`package.json`):

```bash
pnpm install
pnpm dev:attendance   # build shared rồi nest start --watch
pnpm dev:admin        # dashboard Vite
pnpm dev:mobile       # Expo
pnpm dev:shared       # watch build shared
pnpm build            # shared + attendance + admin
```

Yêu cầu: Node `>= 20`, pnpm `11.x`.

---

## 4. Backend (NestJS)

### 4.1 Bootstrap (`src/main.ts`)

- Logger Winston JSON
- CORS mở (`enableCors`)
- `ValidationPipe` (`whitelist`, `transform`)
- `ApiExceptionFilter` — lỗi HTTP thành `ApiResponse` `{ success: false, code, message }`
- Swagger: `http://localhost:3000/api-docs`
- Listen `0.0.0.0`, cổng `PORT` hoặc `3000`

### 4.2 `AppModule`

Import: Config (global), Throttler (5 request / 60s toàn cục), Database, Auth, Users, AttendanceSessions, Geo, AttendanceValidation, AttendanceCheckIn, Logging, Health.

Middleware: `RequestIdMiddleware` cho mọi route.  
Guard toàn cục: `ThrottlerGuard`.  
Interceptor: `HttpLoggingInterceptor`.

### 4.3 Module và trách nhiệm

| Thư mục | Trách nhiệm |
|---|---|
| `auth/` | Login local + JWT + refresh, tách endpoint user/admin, `JwtAuthGuard`, `RolesGuard` |
| `account/` | Tài khoản đăng nhập (username/password bcrypt) |
| `users/` | Hồ sơ user, lọc sinh viên khi tạo session |
| `attendance-sessions/` | CRUD phiên, đóng sớm, chi tiết kèm danh sách điểm danh |
| `attendance-check-in/` | `POST .../check-in`, attempt, device duplicate |
| `attendance-validation/` | Mock location, Haversine, integrity score |
| `attendance-record/` | Bản ghi điểm danh, lịch sử sinh viên |
| `geo/` | Haversine, bán kính |
| `health/` | DB, migration, CPU/RAM |
| `common/` | Prisma, filter, logging, request-id |

Persistence: **Prisma repository thật** (PostgreSQL). Còn một số mock repository dùng cho unit test, không phải đường chạy production.

### 4.4 Auth

Hai cổng login, cùng `AuthService.validateUser` (bcrypt + Account + User):

| Endpoint | Ai được phép |
|---|---|
| `POST /v0/user/auth/login` | Chỉ `role === student` |
| `POST /v0/admin/auth/login` | `lecturer` hoặc `admin` |
| `POST /v0/user/auth/refresh` | Refresh JWT sinh viên |
| `POST /v0/admin/auth/refresh` | Refresh JWT giảng viên/admin |

Payload JWT: `{ sub: userId, username, role }`.

Trả về:

```ts
{ accessToken, refreshToken }
```

- Access: `JWT_SECRET`, hết hạn `EXPIRES_IN` (mặc định `1h`)
- Refresh: `REFRESH_TOKEN_SECRET`, hết hạn `REFRESH_TOKEN_EXPIRES_IN` (mặc định `14d`)

Login user bị throttle riêng 5 lần / 60s.

Decorator: `@CurrentUser()`, `@Roles('admin', 'lecturer', ...)`.

### 4.5 Danh sách API

Nhiều controller khai báo **cả path cũ và `v0/`** để client gọi được cả hai.

**Health**

- `GET /health` và `GET /v0/health` — trạng thái `ok | degraded | error`, latency DB, số migration, bộ nhớ/CPU

**Users**

- `GET /users/me` — JWT, profile `{ code, role, fullname }`
- `GET /users` — admin, tất cả user
- `GET /users/:id` — admin

**Sessions** (`/attendance-sessions` và `/v0/attendance-sessions`)

| Method | Path | Role | Ý nghĩa |
|---|---|---|---|
| POST | `/` | admin, lecturer | Tạo phiên + sinh record `absent` cho sinh viên lọc được |
| GET | `/mine` | student | Phiên mình được gán |
| GET | `/created-by-me` | lecturer, admin | Phiên mình tạo |
| GET | `/created-by?userId=` | admin | Phiên theo giảng viên |
| GET | `/` | admin: tất cả; lecturer: chỉ của mình | Danh sách |
| DELETE | `/:id` | admin hoặc người tạo | Xóa phiên (cascade record/attempt) |
| POST | `/:id/close` | admin hoặc người tạo | Đóng sớm (`closeAt = now`) |
| GET | `/by-user/:userId` | admin | Phiên theo user |
| GET | `/:id/detail` | admin, lecturer | Chi tiết + danh sách sinh viên |
| GET | `/:id` | admin, lecturer | Thông tin cơ bản |

**Check-in / records**

- `POST /attendance/check-in` (và `v0`) — JWT sinh viên
- `GET /attendance/records/mine` (và `v0`) — lịch sử chi tiết của mình

**Gốc**

- `GET /` — ping AppController

### 4.6 Trạng thái phiên (computed, không lưu DB)

```text
now < openAt              → pending
openAt ≤ now ≤ closeAt    → open
now > closeAt             → closed
```

Đóng sớm chỉ cập nhật `closeAt` thành thời điểm hiện tại.

### 4.7 Tạo phiên và phân bổ sinh viên

Body (`CreateAttendanceSessionDto`):

- `title`, `latitude`, `longitude`, `radius` (mét, > 0)
- `openAt`, `closeAt` (ISO string, `closeAt` phải sau `openAt`)
- `participantCriteria` — hiện **chỉ dùng `codeFilter.addCodes`**

`UserFilterService`:

- Không mã / chứa `ALL` / rỗng → **mọi sinh viên**
- Có mã → khớp `User.code` (không phân biệt hoa thường)
- Không khớp ai → **fallback mọi sinh viên**

Trong transaction Prisma: tạo `AttendanceSession` rồi `createMany` `AttendanceRecord` status `absent` cho từng `userId`. Unique `(sessionId, userId)`.

Types `unitFilter` / `tagFilter` đã có trong shared nhưng **chưa có model Unit/Tag trong Prisma** — chưa dùng được.

---

## 5. Luồng check-in (nghiệp vụ cốt lõi)

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
6. Số attempt > 3? → REJECTED TOO_MANY_ATTEMPTS (không ném HTTP, trả body)
7. Cùng deviceId đã điểm danh session này cho user khác?
      → REJECTED DUPLICATE_DEVICE
8. Validation GPS / mock / integrity
      REJECTED → không đổi record
      VALID hoặc REVIEW → markPresent (status present, tọa độ, distance, deviceId)
9. Đánh dấu device đã dùng + complete attempt (APPROVED | REVIEW | REJECTED)
```

Payload check-in:

```ts
{
  sessionId: number
  location: {
    latitude, longitude,
    accuracy,          // 0–30 mét (class-validator Max 30)
    timestamp,         // epoch ms
    isMockLocation
  }
  device: { deviceId, platform: 'android'|'ios', model }
  integrity: { integrityToken: string | null }
}
```

Kết quả thành công (`AttendanceCheckInResult`):

- `{ status: 'VALID' }`
- `{ status: 'REVIEW', reasons: [...] }`
- `{ status: 'REJECTED', reasons: [...] }`

### 5.1 Validation GPS (`AttendanceValidationService`)

Trọng số: location **40**, mock **25**, integrity **35**. Tổng tối đa 100.

1. `isMockLocation === true` → hệ số mock = 0 → **REJECTED** `MOCK_LOCATION` ngay.
2. `distance > radius`:
   - `distance ≤ radius + accuracy` → **REVIEW** `OUT_OF_RANGE` (vùng biên do sai số GPS)
   - xa hơn → **REJECTED** `OUT_OF_RANGE`
3. Trong bán kính: `score = mock*25 + location*40 + integrity*35`
   - `LocationCheck`: hệ số 1 nếu `distance + accuracy <= radius`, ngược lại 0
   - `IntegrityCheck`: có `integrityToken` → 0.7, không → 0.5 (**chưa verify Play Integrity / App Attest**)
   - `score >= 80` và không reason → **VALID**
   - `score >= 60` → **REVIEW**
   - dưới 60 → **REJECTED** `LOW_CONFIDENCE_SCORE`

Khoảng cách: Haversine, bán kính Trái Đất 6_371_000 m (`GeoService`).

### 5.2 Attempt và thiết bị

- Mỗi lần gọi check-in tạo 1 `AttendanceAttempt` (tọa độ, accuracy, distance, deviceId, mock flag).
- Quá **3** lần thử / user / session → từ chối.
- `deviceId` đã `markUsed` cho session → user khác không điểm danh được trên cùng máy.

---

## 6. Cơ sở dữ liệu

File: `server/attendance/prisma/schema.prisma` — PostgreSQL.

```text
Account 1 ── 1 User
User 1 ── N AttendanceSession (createdBy)
User 1 ── N AttendanceRecord (sinh viên)
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
| `AttendanceAttempt` | `attendance_attempts` | log mỗi lần thử; result APPROVED/REVIEW/REJECTED; `reasons[]` |

Enum Prisma:

- `Role`: admin, lecturer, student
- `AttendanceStatus`: absent, present, late, excused
- `AttendanceAttemptResult`: APPROVED, REVIEW, REJECTED

Seed local: biến `SEED_*_PASSWORD` trong `.env` backend.

Biến môi trường backend (xem `server/attendance/.env.example`):

```text
PORT, DATABASE_URL, JWT_SECRET, EXPIRES_IN,
REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN, MOBILE_DEV_IP,
SEED_ADMIN_PASSWORD, SEED_LECTURER_PASSWORD, SEED_STUDENT_*_PASSWORD
```

---

## 7. Shared package

Export: `types` + `api`.

- `ApiResponse<T>` = `{ success: true, data: T }` hoặc `{ success: false, code, message }`
- Error codes tách domain: auth, user, session, check-in, record, common
- Types: session, check-in payload/result, validation reason, user filter, device, login
- `createHttpClient` — dashboard dùng; mobile có HTTP riêng trong `src/api/api.ts`

Mọi thay đổi contract phải build `pnpm build:shared` trước khi client/server consume `dist/`.

---

## 8. Admin dashboard (web)

Stack: React 19, Vite, React Router, react-toastify.

Route:

| Path | Màn hình |
|---|---|
| `/` `*` | redirect `/login` |
| `/login` | `LoginPage` — `POST /v0/admin/auth/login` |
| `/dashboard` | danh sách phiên, tạo phiên, đóng/xóa |
| `/sessions/:id` | chi tiết phiên + sinh viên |

Bảo vệ: `ProtectedRoute` đọc user từ `useAuth` (token `localStorage` key `token`).

API:

- `VITE_API_BASE_URL` (mặc định `http://localhost:3000`)
- `auth.api.ts`, `attendance-sessions.api.ts`, `users.api.ts`

UI chính: `SessionTable`, `CreateSessionModal`, `DashboardSidebar`, `ConfirmModal`, pagination/empty/error/skeleton.

Lecturer chỉ thấy phiên mình tạo; admin thấy tất cả.

---

## 9. Mobile client (sinh viên)

Stack: Expo SDK 54, React Native, Expo Router.

Màn hình:

| Route | Chức năng |
|---|---|
| `/` | Điều hướng theo trạng thái đăng nhập |
| `/login` | `POST /v0/user/auth/login` |
| `/(tabs)/` | Check-in: GPS, danh sách session `/v0/attendance-sessions/mine` |
| `/(tabs)/history` | `GET /attendance/records/mine` |
| `/(tabs)/profile` | Hồ sơ |

Token: `token-storage.ts` (lưu an toàn trên máy). Refresh: `POST /v0/user/auth/refresh`.

Check-in gửi location (kèm `isMockLocation`), `deviceId` cài đặt, integrity token nếu có.

Cấu hình: `EXPO_PUBLIC_API_URL` (thường `http://<IP LAN>:3000` — không dùng `localhost` trên điện thoại thật).

Lưu ý: `getAttendanceRecord` chi tiết từng record **chưa có API backend** — client trả lỗi cứng.

Logout gọi `/v0/user/auth/logout` nhưng **backend chưa có endpoint logout**.

---

## 10. Quan sát, bảo mật, vận hành

Đã có:

- JWT access + refresh
- Tách login student / staff
- Role guard
- Rate limit (throttler)
- Request ID + HTTP logging
- Health check DB + migration
- Docker Compose + Dockerfile backend/dashboard
- Swagger
- E2E/unit test trong `server/attendance` (`test/`, `*.spec.ts`)

Hạn chế hiện tại (cần biết khi bảo vệ đồ án / triển khai):

- CORS mở toàn bộ origin
- Integrity token **chưa verify** với Google/Apple
- Không có logout/revoke token phía server
- `unitFilter` / `tagFilter` chưa có dữ liệu
- Fallback “mọi sinh viên” khi nhập sai mã có thể gán nhầm cả lớp
- Accuracy GPS bị chặn tối đa 30 m ở DTO
- Mobile logout/record-detail lệch contract với API
- README/ARCHITECTURE cũ vẫn nói “in-memory” — **không còn đúng**; persistence là Prisma/PostgreSQL

---

## 11. Luồng nghiệp vụ end-to-end

```text
1. Admin/lecturer đăng nhập dashboard
2. Tạo phiên: tiêu đề, GPS tâm (bản đồ/nhập tay), bán kính, giờ mở/đóng, mã SV
3. DB: session + N record absent
4. Sinh viên đăng nhập app → thấy phiên trong /mine khi tới giờ
5. App lấy GPS → POST check-in
6. Server: attempt + anti-fraud + validation
7. VALID/REVIEW → record = present
8. Giảng viên mở /sessions/:id xem ai present/absent, khoảng cách, thiết bị
9. Đóng phiên sớm hoặc chờ closeAt
```

---

## 12. Cấu trúc thư mục (rút gọn)

```text
gps-attendance-main/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── packages/shared/src/
│   ├── api/          # response, http client, error codes
│   └── types/        # auth, users, attendance, device
├── server/attendance/
│   ├── prisma/schema.prisma
│   ├── Dockerfile
│   └── src/          # modules NestJS (mục 4.3)
├── client/admin-dashboard/src/
│   ├── pages/        # Login, Dashboard, SessionDetail
│   ├── api/ hooks/ components/ context/
├── client/mobile-client/src/
│   ├── app/          # Expo Router
│   ├── api/ components/ context/ services/
└── docs/             # SYSTEM.md (file này) + conventions + phase notes
```

---

## 13. Tài liệu khác trong repo

| File | Khi nào đọc |
|---|---|
| [SYSTEM.md](SYSTEM.md) | **Tài liệu hệ thống đầy đủ (bản này)** |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Sơ đồ cũ; một số đoạn scoring/in-memory **lệch code hiện tại** — lấy mục 5 ở đây làm chuẩn |
| [conventions/](conventions) | ApiResponse, module Nest, guard, naming |
| [PHASE1_AUDIT.md](PHASE1_AUDIT.md) / [PHASE2_SECURITY.md](PHASE2_SECURITY.md) / [PHASE3_ATTENDANCE.md](PHASE3_ATTENDANCE.md) | Nhật ký giai đoạn phát triển |
| `server/attendance/README.md`, `client/*/README.md` | Chạy từng package |

---

**Phiên bản tài liệu:** 2.0  
**Nguồn sự thật:** mã nguồn `server/attendance`, `client/*`, `packages/shared`, `prisma/schema.prisma`, `docker-compose.yml`.
