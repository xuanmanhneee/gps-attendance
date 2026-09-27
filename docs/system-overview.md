# Tổng quan hệ thống GPS Attendance

## 1. Mục tiêu hệ thống

GPS Attendance là hệ thống điểm danh bằng vị trí GPS với 3 đối tượng chính:
- Sinh viên điểm danh từ ứng dụng mobile
- Giảng viên/admin quản lý phiên điểm danh trên dashboard web
- Backend API xác thực, kiểm tra vị trí và lưu lịch sử điểm danh

## 2. Kiến trúc tổng quan

```text
Mobile App (Expo / React Native)     Web Dashboard (React / Vite)     Backend (NestJS)
           |                                    |                              |
           |-------- login / JWT -------------->|                              |
           |                                    |---- login / JWT ---------->|
           |                                    |                              |
           |---- GPS + device metadata ----->|                              |
           |                                    |                              |-> Validate session
           |                                    |                              |-> Check radius / mock location
           |                                    |                              |-> Save attendance record
           |<----- attendance result -----------|                              |
           |                                    |<---- session data -----------|
```

## 3. Cấu trúc monorepo

```text
gps-attendance-main/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.json
├── docker-compose.yml
├── client/
│   ├── admin-dashboard/
│   └── mobile-client/
├── packages/
│   └── shared/
├── server/
│   └── attendance/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── QUICK_REFERENCE.md
│   ├── SYSTEM_OVERVIEW.md
│   ├── system-overview.md
│   └── conventions/
└── .vscode/
```

## 4. Thành phần chính

### 4.1 Backend
Vị trí: `server/attendance`

Các module quan trọng:
- `auth` — login, JWT, guard, role
- `users` — user management
- `account` — account và credential
- `attendance-sessions` — time-based session management
- `attendance-check-in` — check-in endpoint
- `attendance-validation` — anti-fraud validation
- `attendance-record` — record history
- `geo` — distance calculation
- `common` — logging, database, exception handling

### 4.2 Admin dashboard
Vị trí: `client/admin-dashboard`

Dùng React + Vite, có các màn hình:
- login
- dashboard overview
- session detail

### 4.3 Mobile app
Vị trí: `client/mobile-client`

Dùng Expo + React Native, có route flow:
- login
- tab điểm danh
- lịch sử điểm danh
- profile

### 4.4 Shared package
Vị trí: `packages/shared`

Dùng chung cho type, DTO, response contract và error codes.

## 5. Workflow thực tế

### 5.1 Login
1. Client gọi endpoint login theo role.
2. Backend kiểm tra tài khoản trong `Account` và `User`.
3. Trả JWT chứa `userId` của user.
4. Client lưu token để truy cập API bảo vệ.

### 5.2 Tạo session
2. Lecturer/admin tạo session ở dashboard.
3. Backend nhận `title`, `latitude`, `longitude`, `radius`, `openAt`, `closeAt`.
4. Backend lưu session qua Prisma repository; trạng thái attempt và device usage
    của check-in hiện vẫn lưu trong in-memory store.

### 5.3 Check-in GPS
1. Sinh viên dùng app mobile để lấy GPS hiện tại.
2. App thu thập `latitude`, `longitude`, `accuracy`, `deviceId`, `isMockLocation`.
3. Client gửi request lên endpoint `POST /attendance/check-in`.
4. Server xác thực token và kiểm tra session đang mở.
5. Hệ thống đánh giá vị trí, mock location và độ tin cậy thiết bị.
6. Trả kết quả cho app.

## 6. Validation chính

Module `attendance-validation` đang thực hiện các check chính:
- `LocationCheck`: so sánh khoảng cách với bán kính cho phép
- `MockLocationCheck`: phát hiện vị trí giả hoặc flag hệ thống
- `IntegrityCheck`: đánh giá thiết bị, dữ liệu và sự đáng tin cậy

## 7. Database state hiện tại

File Prisma hiện có:
- `server/attendance/prisma/schema.prisma`

Schema mô tả các model `Account`, `User`, `AttendanceSession`, `AttendanceRecord`, `AttendanceAttempt` và enum `Role`, `AttendanceStatus`.

> Cấu hình database đã có, nhưng trong code hiện tại nhiều luồng nghiệp vụ vẫn đang dùng store in-memory, nên đây là trạng thái prototype phát triển hơn là production-ready.

## 8. API response convention

Mọi response backend nên theo contract:

```ts
{ success: true, data: ... }
```

hoặc

```ts
{ success: false, code: '...', message: '...' }
```

Quy ước này được đặt trong `docs/conventions/api-response.md` và package shared.

## 9. Cài đặt và chạy

### Cài dependencies
```bash
cd gps-attendance-main
pnpm install
```

### Chạy backend
```bash
pnpm dev:attendance
```

### Chạy dashboard
```bash
pnpm dev:admin
```

### Chạy mobile app
```bash
pnpm dev:mobile
```

### Build toàn bộ
```bash
pnpm build
```

## 10. Ghi chú triển khai

- Dự án đang ở giai đoạn phát triển, không phải hoàn chỉnh production.
- Chưa chuyển hoàn toàn toàn bộ data layer sang Prisma/repository thật.
- Nhiều module đã có cấu trúc rõ nét và chuẩn hóa phần API contract.
- Shared package là nền tảng để tránh sai lệch kiểu dữ liệu giữa client và server.

## 11. Tài liệu liên quan

- [README.md](../README.md)
- [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- [docs/conventions](conventions)
- [server/attendance/README.md](../server/attendance/README.md)
- [client/admin-dashboard/README.md](../client/admin-dashboard/README.md)
- [client/mobile-client/README.md](../client/mobile-client/README.md)


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
