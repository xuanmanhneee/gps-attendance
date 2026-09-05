# Tài liệu cấu trúc hệ thống GPS Attendance

## 1. Phạm vi và trạng thái

GPS Attendance là monorepo pnpm cho hệ thống điểm danh theo vị trí GPS. Sinh viên dùng ứng dụng Expo để gửi yêu cầu check-in; giảng viên hoặc quản trị viên dùng dashboard web để quản lý phiên điểm danh.

Tài liệu này mô tả **trạng thái thực tế của mã nguồn hiện tại**. Backend đang dùng các store in-memory cho user, session và attendance record; Prisma/PostgreSQL mới chỉ có cấu hình nền, chưa được kết nối vào luồng nghiệp vụ.

## 2. Kiến trúc tổng quan

```text
Student Mobile (Expo / React Native)       Admin Dashboard (React / Vite)
             |                                      |
             | HTTP + Bearer JWT                   | HTTP + Bearer JWT
             +------------------+-------------------+
                                v
                  NestJS Attendance API
       Config + CORS + ValidationPipe + Swagger + Error Filter
                                |
       +------------------------+-------------------------+
       |                        |                         |
   Auth / Users          Attendance Sessions       Check-in + Validation
       |                        |                         |
   Account mock             Session store          Record store (memory)
                                |
                         Geo distance service

       Shared TypeScript types, DTO contracts and error codes
```

### Thành phần chính

| Thành phần | Thư mục | Vai trò | Trạng thái |
|---|---|---|---|
| Backend API | `server/attendance` | Auth, session, check-in, GPS và validation | Đang phát triển |
| Mobile client | `client/mobile-client` | Login, điểm danh, lịch sử, thông tin người dùng | Expo SDK 54 |
| Admin dashboard | `client/admin-dashboard` | Login và màn hình dashboard cho admin/lecturer | Prototype |
| Shared package | `packages/shared` | Type, DTO contract, API response và error code | Dùng chung |
| Database | `server/attendance/prisma` | Cấu hình Prisma cho PostgreSQL | Chưa có model/schema nghiệp vụ |

## 3. Cấu trúc monorepo

```text
gps-attendance-main/
├── AGENTS.md                         # Chỉ dẫn và quy ước repo
├── package.json                      # Script và package manager ở root
├── pnpm-workspace.yaml               # Khai báo workspace
├── pnpm-lock.yaml                    # Lockfile duy nhất
├── tsconfig.json                     # TypeScript cấp repo
├── docker-compose.yml                # Cấu hình Docker khi cần
├── README.md                         # Cài đặt và chạy nhanh
├── client/
│   ├── admin-dashboard/              # React + Vite cho admin/lecturer
│   └── mobile-client/                # Expo Router + React Native cho student
├── packages/
│   └── shared/                       # Package @gps-attendance/shared
├── server/
│   └── attendance/                   # NestJS API
│       ├── prisma/schema.prisma      # Cấu hình Prisma hiện tại
│       ├── src/                      # Mã nguồn backend
│       └── test/                     # E2E test
└── docs/
    ├── system-overview.md            # Tài liệu này, nguồn tham chiếu chính
    └── conventions/                  # Quy ước API, auth, module và naming
```

Monorepo dùng pnpm 11.12.0 và yêu cầu Node.js từ 20 trở lên. Cài dependency một lần ở root để giữ liên kết workspace và một lockfile duy nhất.

## 4. Backend: `server/attendance`

### 4.1 Điểm khởi động và cấu hình

- `src/main.ts` tạo Nest application, bật CORS, `ValidationPipe({ whitelist: true, transform: true })`, `ApiExceptionFilter` và Swagger tại `/api-docs`.
- Port đọc từ `PORT`, mặc định là `3000`; server lắng nghe trên `0.0.0.0`.
- `src/app.module.ts` đăng ký `ConfigModule`, `AuthModule`, `UsersModule`, `AttendanceSessionsModule`, `GeoModule`, `AttendanceValidationModule`, `AttendanceCheckInModule` và `LoggingModule`.
- `JWT_SECRET` là biến môi trường bắt buộc vì `JwtModule` dùng `ConfigService.getOrThrow()`.

### 4.2 Cấu trúc backend

```text
server/attendance/
├── prisma/schema.prisma              # provider PostgreSQL, chưa có model
├── src/
│   ├── main.ts                       # Bootstrap HTTP server
│   ├── app.module.ts                 # Root dependency graph
│   ├── app.controller.ts             # Endpoint mặc định
│   ├── app.service.ts
│   ├── account/                      # Account và credential mock
│   ├── auth/                         # Login, JWT, guard, role
│   ├── users/                        # User, repository và filter
│   ├── attendance-sessions/          # Tạo và đọc session
│   ├── attendance-check-in/          # POST /attendance/check-in
│   ├── attendance-validation/        # Anti-fraud và scoring
│   ├── attendance-record/            # Interface và in-memory store
│   ├── geo/                          # Tính khoảng cách GPS
│   └── common/
│       ├── filters/                   # Chuẩn hóa exception response
│       └── logging/                   # Logger abstraction/adapter
└── test/                             # E2E test và cấu hình Jest
```

### 4.3 Auth và phân quyền

`AuthModule` gồm `AdminAuthController`, `UserAuthController`, `AuthService`, `LocalStrategy` và `JwtStrategy`.

Luồng xác thực:

1. Client gửi username/password tới endpoint login phù hợp.
2. Strategy và `AuthService` xác thực qua `AccountModule` và `UsersModule`.
3. Server phát JWT với `userId` của `User`, không phải `Account.id`; token hết hạn sau 1 giờ.
4. Client gửi `Authorization: Bearer <token>` ở request cần bảo vệ.
5. `JwtAuthGuard` giải mã token và `CurrentUser` lấy `AuthenticatedUser`.
6. `RolesGuard` kết hợp `@Roles(...)` để giới hạn quyền.

Vai trò chính là `student`, `lecturer` và `admin`. Route tạo session yêu cầu `admin` hoặc `lecturer`. Route check-in hiện chỉ yêu cầu JWT ở controller; việc giới hạn riêng `student` chưa được áp dụng tại controller này.

### 4.4 Attendance sessions

Các file trong `attendance-sessions/` gồm model, controller, service và DTO `create-attendance-session.dto.ts`, `check-location.dto.ts`.

Session gồm title, latitude, longitude, radius, openAt, closeAt, createdBy và timestamps. `status` được tính động từ thời gian hiện tại:

- `pending`: chưa tới `openAt`;
- `open`: `openAt <= now <= closeAt`;
- `closed`: sau `closeAt`.

Service giữ session trong mảng memory và cấp id tăng dần. Khi khởi tạo, một test session mặc định được tạo với tọa độ và danh sách code sinh viên mẫu.

### 4.5 Check-in và validation

Endpoint `POST /attendance/check-in` nhận `CheckInRequestDto`:

```json
{
  "sessionId": 1,
  "location": {
    "latitude": 11.9404,
    "longitude": 108.4583,
    "accuracy": 10,
    "timestamp": 1755345600000,
    "isMockLocation": false
  },
  "device": {
    "deviceId": "installation-id",
    "platform": "android",
    "model": "Pixel 8"
  },
  "integrity": { "integrityToken": null }
}
```

Luồng xử lý:

1. Resolve session; session không `open` bị từ chối.
2. Đọc record cũ theo `sessionId + userId` từ `IAttendanceRecordStore`.
3. Dùng thời gian server `new Date()`, không tin timestamp check-in của client.
4. Gọi `AttendanceValidationService` với session, user, location, device và integrity.
5. Trả kết quả validation. Luồng hiện tại chưa gọi `upsertRecord` sau validation thành công.

Ba check được đăng ký trong `AttendanceValidationModule`:

- `LocationCheck`: tính khoảng cách GPS và hệ số vị trí.
- `MockLocationCheck`: đánh giá cờ mock location.
- `IntegrityCheck`: đánh giá integrity payload/token.

Validation có hai lớp:

- Hard-block: record cũ trả `REJECTED/DUPLICATE_DEVICE`; mock location có coefficient bằng 0 trả `REJECTED/MOCK_LOCATION`.
- Risk score: integrity 35%, mock location 25%, location 40%. Score từ 80 là `VALID`, từ 60 là `REVIEW`, thấp hơn là `REJECTED`. Ngoài vùng thêm lý do `OUT_OF_RANGE`.

Lưu ý: service check-in hiện đặt `existingRecordCount = 0` sau khi đọc record, nên cơ chế chặn retry/trùng record chưa hoàn chỉnh trong prototype.

### 4.6 Lưu trữ hiện tại

`AttendanceRecordModule` inject `InMemoryAttendanceRecordStore` qua token `ATTENDANCE_RECORD_STORE`. Interface hỗ trợ đọc/upsert record, đếm attempts và xóa theo session. Dữ liệu mất khi server restart.

`User` và `Account` cũng có mock repository/data trong `src/users/mocks` và `src/account/mocks`. `prisma/schema.prisma` mới chỉ khai báo generator client và PostgreSQL datasource, chưa có model nghiệp vụ.

## 5. Mobile client: `client/mobile-client`

Ứng dụng dùng Expo SDK 54, React Native và Expo Router.

```text
src/
├── app/
│   ├── _layout.tsx                  # AuthProvider, ThemeProvider, Stack
│   ├── index.tsx                    # Route root
│   ├── login.tsx                    # Đăng nhập
│   ├── explore.tsx                  # Màn hình mẫu/khám phá
│   └── (tabs)/
│       ├── _layout.tsx              # Tab bar
│       ├── index.tsx                # Điểm danh
│       ├── history.tsx              # Lịch sử
│       └── profile.tsx              # Thông tin người dùng
├── api/                             # HTTP client, auth API, attendance API
├── context/auth-context.tsx         # Auth state toàn cục
├── components/                      # UI dùng lại, GPS và check-in
│   └── ui/                          # Button, Card, Input, Collapsible, icon
├── constants/theme.ts               # Design tokens
├── hooks/                           # Theme và color scheme hooks
└── global.css                       # Style dùng chung
```

`_layout.tsx` bọc app bằng `AuthProvider` và `ThemeProvider`; Stack ẩn header và đăng ký `index`, `login` và `(tabs)`. Tab layout hiển thị Điểm Danh, Lịch Sử và Thông Tin.

## 6. Admin dashboard: `client/admin-dashboard`

Dashboard dùng React, Vite và TypeScript.

```text
src/
├── main.tsx                         # Entry point React
├── App.tsx                          # BrowserRouter và route map
├── App.css
├── index.css
├── assets/hero.png                  # Asset giao diện
└── pages/
    ├── LoginPage.tsx                # /login
    └── DashboardPage.tsx            # /dashboard
```

Route hiện tại: `/login` -> `LoginPage`, `/dashboard` -> `DashboardPage`; `/` và route không tồn tại redirect về `/login`. Đây là prototype; không giả định dashboard đã có đầy đủ CRUD session, báo cáo hoặc user management nếu source chưa có.

## 7. Shared package: `packages/shared`

Package được export từ `src/index.ts` và dùng tên `@gps-attendance/shared`.

```text
src/
├── index.ts
├── types/
│   ├── attendance/                  # Attendance và session types
│   ├── device.types.ts              # Device payload
│   └── users/                       # User filter types
└── api/
    ├── auth/                        # Auth API types
    ├── attendance-session/          # Session API/types
    ├── response/                    # ApiResponse và error codes
    ├── fetch-client.ts
    ├── http.ts
    └── http-client.ts
```

Shared package đồng bộ contract giữa client và server. Response thành công dùng `{ success: true, data }`; lỗi được chuẩn hóa bởi filter và error code trong `api/response/error_codes`.

## 8. API hiện có

| Method | Path | Auth | Mục đích |
|---|---|---|---|
| POST | `/v0/admin/auth/login` | Không | Login admin/lecturer |
| POST | `/v0/user/auth/login` | Không | Login student |
| POST | `/attendance-sessions` | JWT + admin/lecturer | Tạo session |
| GET | `/attendance-sessions` | JWT | Danh sách session |
| GET | `/attendance-sessions/:id` | JWT | Chi tiết session |
| POST | `/attendance/check-in` | JWT | Gửi check-in |
| GET | `/api-docs` | Không | Swagger UI |

Endpoint auth chính xác cần xem trong hai controller auth khi tích hợp client; không nên suy luận thêm endpoint logout/refresh/users nếu chưa có controller tương ứng.

## 9. Các luồng nghiệp vụ

### Tạo phiên

Admin/lecturer login -> nhận JWT -> gọi `POST /attendance-sessions` -> validate DTO -> resolve user filter -> tạo session in-memory -> tạo record `absent` ban đầu cho user phù hợp.

### Sinh viên check-in

Mobile lấy location và device payload -> gửi JWT cùng `CheckInRequestDto` -> server kiểm tra session mở -> validation -> trả `VALID`, `REVIEW` hoặc `REJECTED` cùng reasons.

### Khởi động server

`main.ts` tạo application -> đăng ký module -> bật CORS và validation -> tạo Swagger document -> listen trên port cấu hình.

## 10. Chạy dự án

```bash
corepack enable
pnpm install
pnpm build:shared

pnpm dev:attendance   # Backend, mặc định http://localhost:3000
pnpm dev:admin        # Vite dashboard, mặc định http://localhost:5173
pnpm dev:mobile       # Expo development server
pnpm dev:shared       # Watch build shared khi sửa package shared
```

Build backend và dashboard:

```bash
pnpm build:attendance
pnpm build:admin
pnpm build
```

Khi sửa `packages/shared`, backend dùng output build nên cần chạy `pnpm dev:shared` hoặc build shared lại. Client bundler đọc source TypeScript của workspace theo cấu hình package.

## 11. Tài liệu liên quan

- [README.md](../README.md): cài đặt và quick start.
- [ARCHITECTURE.md](ARCHITECTURE.md): sơ đồ kiến trúc tham khảo.
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md): lệnh và thao tác nhanh.
- [conventions/api-response.md](conventions/api-response.md): response/error contract.
- [conventions/auth-guards.md](conventions/auth-guards.md): JWT và user/account id.
- [conventions/module-structure.md](conventions/module-structure.md): cấu trúc module NestJS.
- [conventions/nameing.md](conventions/nameing.md): naming convention hiện tại.

Khi code thay đổi, cập nhật tài liệu này nếu thay đổi ảnh hưởng đến cấu trúc module, route, contract API hoặc trạng thái lưu trữ.
