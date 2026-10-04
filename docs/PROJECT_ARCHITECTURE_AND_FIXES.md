# Tổng quan hệ thống GPS Attendance và các lỗi thường gặp

## 1. Mục tiêu hệ thống

Hệ thống GPS Attendance là một monorepo quản lý điểm danh theo vị trí GPS cho môi trường học tập. Mục tiêu chính là:

- Sinh viên check-in trong phạm vi địa lý của phiên điểm danh.
- Giảng viên/admin tạo, quản lý và đóng phiên điểm danh.
- Hệ thống chặn các hình thức gian lận như mock location, trùng thiết bị, nhiều lần thử sai và vị trí ngoài bán kính.
- Dữ liệu lưu trữ tập trung trên PostgreSQL thông qua Prisma.

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

### Thành phần chính

- Backend: NestJS + Prisma + PostgreSQL + Redis
- Web dashboard: React + Vite + TypeScript
- Mobile app: Expo + React Native
- Shared package: các DTO/type/contract dùng chung

---

## 3. Cấu trúc monorepo

```text
gps-attendance-main/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── docker-compose.yml
├── client/
│   ├── admin-dashboard/
│   └── mobile-client/
├── packages/
│   └── shared/
├── server/
│   └── attendance/
├── presentation/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SYSTEM.md
│   ├── QUICK_REFERENCE.md
│   └── conventions/
└── scripts/
```

### Vai trò từng package

| Package | Vai trò |
|---|---|
| `server/attendance` | API backend, auth, check-in, session, validation |
| `client/admin-dashboard` | Giao diện web cho giảng viên/admin |
| `client/mobile-client` | App sinh viên dùng GPS |
| `packages/shared` | Contract TypeScript dùng chung |
| `presentation` | Slide thuyết trình |

---

## 4. Backend NestJS

### Module chính

| Module | Trách nhiệm |
|---|---|
| `auth` | Login JWT, refresh token, guard, role |
| `account` | Quản lý credential và password hash |
| `users` | Hồ sơ người dùng |
| `attendance-sessions` | Tạo/kết thúc/xóa phiên điểm danh |
| `attendance-check-in` | Xử lý check-in sinh viên |
| `attendance-validation` | Kiểm tra GPS, mock-location, độ tin cậy |
| `attendance-record` | Lưu và truy vấn lịch sử điểm danh |
| `geo` | Tính khoảng cách Haversine |
| `health` | Kiểm tra hệ thống |
| `units`, `tags` | Phân nhóm và lọc sinh viên |
| `common` | Logging, exception, Prisma, request-id |

### Luồng nghiệp vụ

1. Giảng viên/admin tạo phiên điểm danh.
2. Backend tạo các attendance record cho sinh viên phù hợp tiêu chí.
3. Sinh viên mở app, lấy GPS và gửi check-in.
4. Backend kiểm tra:
   - token JWT
   - phiên đang mở
   - user thuộc phiên
   - số lần thử
   - deviceId trùng lặp
   - khoảng cách so với tâm phiên
   - mock-location / độ chính xác thấp
5. Backend lưu record và trả trạng thái tương ứng.

---

## 5. Quyền và xác thực

Hệ thống có 2 nhánh auth riêng:

- `/v0/user/auth/*` cho student
- `/v0/admin/auth/*` cho lecturer/admin

### Vai trò

- `student`: check-in và xem lịch sử của mình
- `lecturer`: quản lý phiên do mình tạo
- `admin`: quyền toàn hệ thống

### Cơ chế bảo vệ

- JWT access token + refresh token
- `JwtAuthGuard` cho request cần xác thực
- `RolesGuard` kiểm tra quyền theo role
- Redis blacklist cho logout

---

## 6. Dữ liệu và persistence

- PostgreSQL 16
- Prisma ORM
- Redis cho cache/blacklist/lock logic
- Các entity quan trọng:
  - `User`
  - `Account`
  - `AttendanceSession`
  - `AttendanceRecord`
  - `AttendanceAttempt`

---

## 7. Kiểm tra thực tế hiện tại

Tôi đã chạy kiểm tra trên code đang có trong repo:

- Backend build: thành công
- Test repo `PrismaAttendanceRecordRepository`: thành công

### Lệnh đã chạy

```powershell
cd d:\Do-An-Chuyen-Nganh\gps-attendance-main
pnpm build:attendance
```

Kết quả: build hoàn tất mà không bị lỗi TypeScript.

```powershell
cd d:\Do-An-Chuyen-Nganh\gps-attendance-main\server\attendance
pnpm exec jest --runInBand src/attendance-record/repositories/prisma-attendance-record.repository.spec.ts
```

Kết quả: `1 passed, 1 total`.

> Điều này cho thấy dự án hiện tại không còn lỗi build/test cục bộ ở phần backend chính và repository điểm danh.

---

## 8. Các lỗi thường gặp khi dev và cách fix

### 8.1 Lỗi do thiếu dependency / package

```powershell
pnpm install
```

Nếu chưa chạy `pnpm install`, monorepo sẽ thiếu package shared hoặc NestJS dependencies.

### 8.2 Lỗi database / Prisma không khởi tạo

```powershell
docker compose up -d postgres redis
cd server/attendance
npx prisma generate
```

Nếu gặp lỗi liên quan đến Prisma client hoặc database connection, cần chắc chắn PostgreSQL đang chạy và `.env` đúng.

### 8.3 Lỗi Expo mobile dùng localhost

Triển khai mobile không dùng `localhost` khi chạy trên thiết bị thật. Cần dùng IP LAN của máy chạy backend, ví dụ:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.16:3000
```

Không được dùng `localhost` trên điện thoại thật.

### 8.4 Lỗi auth / 401 Invalid credentials

- Kiểm tra username/password đúng
- Kiểm tra login endpoint phù hợp với role (`student` vs `admin`)
- Kiểm tra `JWT_SECRET` / config backend đúng

### 8.5 Lỗi build NestJS / TypeScript

```powershell
cd d:\Do-An-Chuyen-Nganh\gps-attendance-main
pnpm build:attendance
```

Nếu lỗi vẫn còn, cần kiểm tra:

- `node >=20`
- `pnpm` đã cài đúng version
- `@gps-attendance/shared` đã build thành công trước backend

### 8.6 Lỗi port / service chưa lên

```powershell
cd d:\Do-An-Chuyen-Nganh\gps-attendance-main
docker compose up -d
```

Các port chính:

- PostgreSQL: `5432`
- Redis: `6379`
- Backend: `3000`
- Dashboard: `8080`

---

## 9. Hướng chạy dự án nhanh

### Backend

```powershell
cd d:\Do-An-Chuyen-Nganh\gps-attendance-main
pnpm install
pnpm build:shared
pnpm --filter @gps-attendance/attendance dev
```

### Dashboard

```powershell
cd d:\Do-An-Chuyen-Nganh\gps-attendance-main
pnpm --filter @gps-attendance/admin-dashboard dev
```

### Mobile

```powershell
cd d:\Do-An-Chuyen-Nganh\gps-attendance-main
pnpm --filter @gps-attendance/mobile-client dev
```

### Docker nền

```powershell
cd d:\Do-An-Chuyen-Nganh\gps-attendance-main
docker compose up -d
```

---

## 10. Kết luận

Dự án GPS Attendance là một hệ thống monorepo hiện đại với 3 lớp chính:

- giao diện web cho giảng viên/admin,
- app di động cho sinh viên,
- backend và database cho nghiệp vụ điểm danh GPS.

Các nguyên tắc trọng tâm là:

- JWT + role-based access control,
- Prisma + PostgreSQL làm source of truth,
- geo validation và chống gian lận ở backend,
- monorepo shared contract để đồng bộ API giữa client và server.

Nếu gặp lỗi khi chạy, ưu tiên kiểm tra theo thứ tự:

1. `pnpm install`
2. `docker compose up -d`
3. `pnpm build:shared`
4. `pnpm build:attendance`
5. kiểm tra `.env` / IP backend / login credentials

---

## 11. Tài liệu nguồn

- [README.md](../README.md)
- [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- [docs/SYSTEM.md](./SYSTEM.md)
- [AGENTS.md](../AGENTS.md)
- [server/attendance/README.md](../server/attendance/README.md)
