# Kiến trúc hệ thống GPS Attendance

## 1. Tổng quan

Hệ thống GPS Attendance là một monorepo dùng để quản lý điểm danh theo vị trí GPS cho môi trường học tập. Dự án gồm 4 thành phần chính:

- Backend NestJS: cung cấp API, xác thực, nghiệp vụ điểm danh, kiểm tra GPS và quyền truy cập.
- Web dashboard: giao diện quản trị cho giảng viên và admin.
- Mobile app: giao diện cho sinh viên, dùng GPS để check-in và xem lịch sử.
- Shared package: định nghĩa type, DTO, chuẩn lỗi và contract dùng chung giữa các phần.

Mục tiêu của hệ thống là cho phép:

- Sinh viên check-in trong phạm vi địa lý của phiên điểm danh.
- Giảng viên/admin tạo, xem và đóng phiên điểm danh.
- Hệ thống chặn các hình thức gian lận như mock location, trùng thiết bị, số lần thử quá mức và vị trí ngoài bán kính.
- Dữ liệu được lưu trữ trung tâm trên PostgreSQL thông qua Prisma.

---

## 2. Kiến trúc tổng thể

```text
                    ┌──────────────────────────────┐
                    │       packages/shared        │
                    │  types / DTO / api contract  │
                    │  error codes / shared utils  │
                    └──────────────┬───────────────┘
                                   │
          ┌────────────────────────────┼────────────────────────────┐
          ▼                            ▼                            ▼
┌──────────────────────┐    ┌────────────────────────────┐    ┌─────────────────────────────┐
│ Mobile client        │    │ Admin dashboard           │    │ Backend API (NestJS)         │
│ Expo + React Native │    │ React + Vite + TS         │    │ server/attendance            │
│ Student app          │    │ Lecturer/Admin UI         │    │ Auth / Sessions / Check-in   │
└──────────┬───────────┘    └──────────────┬────────────┘    └──────────────┬──────────────┘
           │                               │                              │
           └──────────────┬────────────────┴──────────────────────────────┘
                          │ HTTP + Bearer JWT
                          ▼
                 ┌────────────────────┐
                 │ PostgreSQL + Prisma │
                 │  Sessions / Users   │
                 │  Records / Attempts │
                 └────────────────────┘
                          │
                          ▼
                       Redis / cache
```

---

## 3. Cấu trúc monorepo

```text
gps-attendance-main/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── docker-compose.yml
├── scripts/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SYSTEM.md
│   ├── QUICK_REFERENCE.md
│   └── conventions/
├── client/
│   ├── admin-dashboard/
│   └── mobile-client/
├── packages/
│   └── shared/
├── server/
│   └── attendance/
├── presentation/
└── .github/
```

### Các package trong monorepo

| Package | Mục đích |
|---|---|
| [README.md](README.md) | Tổng quan toàn bộ monorepo và scripts chạy dự án |
| [server/attendance](../server/attendance) | Backend chính, thực thi nghiệp vụ và API |
| [client/admin-dashboard](../client/admin-dashboard) | Giao diện web cho giảng viên/admin |
| [client/mobile-client](../client/mobile-client) | Ứng dụng di động cho sinh viên |
| [packages/shared](../packages/shared) | Contract dùng chung: types, DTO, error codes |
| [presentation](../presentation) | Slide, tài liệu thuyết trình và hình ảnh demo |

---

## 4. Mô hình triển khai

### 4.1 Môi trường local

Dự án dùng Docker Compose cho các service nền:

| Service | Port | Chức năng |
|---|---:|---|
| PostgreSQL | 5432 | Cơ sở dữ liệu chính |
| Redis | 6379 | Cache / blacklist token / cấu hình nhanh |
| Backend NestJS | 3000 | API hệ thống |
| Admin dashboard | 8080 | Phục vụ build static của dashboard |

### 4.2 Mobile runtime

Ứng dụng mobile không chạy trong Docker. Nó chạy trên Expo Go hoặc Simulator/Device và cần trỏ đến IP LAN của máy chạy backend, ví dụ:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.16:3000
```

Điều này quan trọng vì thiết bị thật không thể dùng localhost như máy chủ backend.

### 4.3 Web dashboard

Dashboard chạy bằng React + Vite. Nó gọi API backend qua JWT token và hiển thị dữ liệu điểm danh, phiên, người dùng và báo cáo quyền.

---

## 5. Backend NestJS

### 5.1 Vị trí code

Backend nằm trong [server/attendance](../server/attendance). Cấu trúc chính:

```text
server/attendance/src/
├── app.module.ts
├── app.controller.ts
├── app.service.ts
├── main.ts
├── account/
├── auth/
├── attendance-check-in/
├── attendance-record/
├── attendance-sessions/
├── attendance-validation/
├── common/
├── geo/
├── health/
├── redis/
├── tags/
├── units/
├── users/
└── prisma/
```

### 5.2 Mỗi module làm gì

| Module | Trách nhiệm |
|---|---|
| auth | Xác thực người dùng, JWT, refresh token và Guards |
| account | Quản lý thông tin tài khoản đăng nhập |
| users | Hồ sơ người dùng và truy vấn dữ liệu user |
| attendance-sessions | Tạo, xem, đóng, xóa phiên điểm danh |
| attendance-check-in | Xử lý check-in của sinh viên |
| attendance-validation | Kiểm tra vị trí, mock-location, độ tin cậy, giới hạn quyền |
| attendance-record | Lưu và truy vấn lịch sử điểm danh |
| geo | Tính khoảng cách Haversine giữa vị trí người dùng và tâm phiên |
| health | Health check và monitoring tình trạng hệ thống |
| common | Exception filter, logging, request-id, shared utilities |
| units / tags | Nền tảng lọc và phân nhóm sinh viên theo đơn vị / nhãn |

### 5.3 Bootstrap và chuẩn runtime

Nút khởi động là [server/attendance/src/main.ts](../server/attendance/src/main.ts). Ở đây backend thực hiện:

- bật CORS
- dùng ValidationPipe để validate input
- dùng global exception filter để chuẩn hóa lỗi API
- thêm Swagger docs tại `/api-docs`
- lắng nghe trên `0.0.0.0` và cổng cấu hình hoặc 3000

---

## 6. Xác thực và phân quyền

Hệ thống dùng JWT với hai nhánh auth riêng:

- `/v0/user/auth/*` cho sinh viên
- `/v0/admin/auth/*` cho giảng viên/admin

### Luồng auth

```text
Client -> Login endpoint
  -> validate username/password
  -> generate access token + refresh token
  -> client gửi Bearer token trên các request cần bảo vệ
  -> JwtAuthGuard verify token
  -> RolesGuard kiểm tra quyền theo role
  -> controller/service xử lý request
```

### Vai trò chính

- `student`: sinh viên, chỉ check-in và xem phiên/record của mình
- `lecturer`: giảng viên, tạo và quản lý phiên của chính mình
- `admin`: quản trị, có quyền xem toàn bộ hệ thống

---

## 7. Luồng nghiệp vụ điểm danh

### 7.1 Tạo phiên

Giảng viên/admin gửi request tạo phiên với thông tin:

- title
- tọa độ latitude, longitude
- radius (mét)
- openAt, closeAt
- tiêu chí tham gia (nếu có)

Backend tạo `AttendanceSession` và sinh ra các `AttendanceRecord` cho người dùng phù hợp với tiêu chí. Mỗi bản ghi mặc định ở trạng thái `absent` để chờ sinh viên check-in.

### 7.2 Sinh viên check-in

Luồng thực thi:

```text
Sinh viên mở app
  -> lấy GPS + device info + app integrity
  -> gửi POST /attendance/check-in với JWT
  -> backend xác thực token
  -> kiểm tra phiên đang mở và người dùng thuộc phiên
  -> kiểm tra số lần thử / thiết bị / trạng thái duplicate
  -> tính khoảng cách từ vị trí người dùng đến tâm phiên
  -> áp dụng các rule chống gian lận
  -> lưu record và trả về kết quả approve / rejected / flagged
```

### 7.3 Các nguyên tắc chống gian lận

Hệ thống phân tích các yếu tố sau:

- khoảng cách đến tâm phiên (Haversine)
- độ chính xác GPS (accuracy)
- mock-location / giả lập vị trí
- số lần thử check-in thất bại
- thiết bị lặp lại / deviceId
- điểm tin cậy của dữ liệu vị trí

Nếu vị trí ngoài bán kính hoặc độ tin cậy thấp, backend sẽ trả về lỗi hoặc trạng thái từ chối phù hợp.

---

## 8. Cấu trúc dữ liệu

Dữ liệu chính được quản lý qua Prisma và PostgreSQL. Các entity quan trọng gồm:

- `User`: người dùng hệ thống
- `Account`: thông tin đăng nhập, mật khẩu hash
- `AttendanceSession`: phiên điểm danh
- `AttendanceRecord`: bản ghi theo người dùng cho từng phiên
- `AttendanceAttempt`: số lần check-in thử

Quan hệ điển hình:

```text
User 1 --- N AttendanceRecord
User 1 --- N AttendanceAttempt
AttendanceSession 1 --- N AttendanceRecord
AttendanceSession 1 --- N AttendanceAttempt
```

---

## 9. API và chuẩn response

Hệ thống dùng chuẩn giao tiếp thống nhất qua shared package. Mỗi response có dạng:

```ts
{
  success: true,
  data: {...}
}
```

Và lỗi có dạng:

```ts
{
  success: false,
  code: 'ATTENDANCE_SESSION_NOT_FOUND',
  message: 'Phiên điểm danh không tồn tại'
}
```

Điều này giúp frontend và mobile xử lý lỗi theo cùng một chuẩn, thay vì phụ thuộc vào từng controller trả text hay object riêng lẻ.

---

## 10. Web dashboard và mobile app

### 10.1 Dashboard web

Dashboard được xây dựng bằng React + Vite. Nó tập trung vào:

- đăng nhập admin/lecturer
- tạo và xem các phiên điểm danh
- xem danh sách sinh viên trong từng phiên
- tracking trạng thái check-in
- thao tác xóa phiên và xem chi tiết

### 10.2 Mobile app

Mobile app sử dụng Expo + React Native. Nó cho phép:

- đăng nhập sinh viên
- xem danh sách phiên được gán
- kiểm tra vị trí người dùng
- thực hiện điểm danh bằng GPS
- hiển thị kết quả thành công/thất bại với lý do rõ ràng

---

## 11. Shared package

Package [packages/shared](../packages/shared) là lớp “contract” của hệ thống. Nó chứa:

- type dữ liệu dùng chung giữa client và server
- enum / error code
- DTO chuẩn hóa
- các helper request/response API

Vì vậy, mọi thay đổi về API contract nên được làm ở shared package trước khi mở rộng frontend hoặc backend.

---

## 12. Quy trình phát triển và kiểm tra

Các lệnh chính ở root:

```bash
pnpm install
pnpm build:shared
pnpm dev:attendance
pnpm dev:admin
pnpm dev:mobile
pnpm build
```

Mỗi phần của monorepo có trách nhiệm riêng nhưng cùng sử dụng chung shared package, nên khi sửa contract hoặc DTO, cần rebuild và kiểm tra cả backend lẫn frontend liên quan.

---

## 13. Kết luận

GPS Attendance là một hệ thống monorepo hướng nghiệp vụ, trong đó backend là trung tâm điều phối quy trình điểm danh, còn web/mobile là giao diện tương tác. Cấu trúc hiện tại rất phù hợp cho việc mở rộng vì:

- role-based access rõ ràng
- module hóa theo nghiệp vụ
- contract chung được quản lý ở shared package
- validation GPS và anti-fraud được tách riêng khỏi controller
- dữ liệu được lưu trữ trung tâm qua Prisma/PostgreSQL

Đây là kiến trúc nền tảng đủ mạnh để tiếp tục phát triển cho phiên bản production, đồng thời vẫn dễ kiểm thử và bảo trì.

---

## 14. Tài liệu liên quan

- [README.md](../README.md)
- [docs/SYSTEM.md](SYSTEM.md)
- [docs/QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- [docs/conventions](conventions)

  │  → coeff = 50/50 = 1.0 (on boundary)
  └─ distance = 100m, radius = 50m
     → coeff = 100/50 = 1.0 (capped at 1.0, far outside)

Haversine Formula:
  Δlat = lat2 - lat1
  Δlon = lon2 - lon1
  a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
  c = 2 × atan2(√a, √(1-a))
  distance = R × c
  
  Where R = 6,371,000 meters (Earth's mean radius)
```

### Mock Location Check Algorithm

```
Input:
  isLocationMocked: boolean      (from Android system)
  locationProvider: string       ('gps' | 'network' | 'fused')
  previousLocation: {lat, lon, time}
  currentLocation: {lat, lon, time}

Calculate:
  suspicionScore = 0.0
  
  if (isLocationMocked == true):
    suspicionScore += 0.8  // Strong signal
  
  if (locationProvider != 'gps'):
    suspicionScore += 0.3  // Network-only locations less reliable
  
  // Impossible movement check
  distance = Haversine(previousLocation, currentLocation)
  timeDelta = currentLocation.time - previousLocation.time
  requiredTime = distance / (maxHumanSpeed = 10 m/s)
  
  if (timeDelta < requiredTime * 0.8):
    suspicionScore += 0.7  // Physically impossible
  
  mockLocationCoefficient = min(1.0, suspicionScore)

Examples:
  ├─ isLocationMocked=false, provider=gps, normal movement
  │  → coeff = 0.0 (clean)
  ├─ isLocationMocked=true, provider=network, 100km in 1 sec
  │  → coeff = 1.0 (highly suspicious)
  └─ provider=network, normal movement
     → coeff = 0.3 (slightly suspicious)
```

### Integrity Check Algorithm

```
Input:
  deviceFingerprint = {
    deviceId: string,
    deviceModel: string,
    osVersion: string,
    appVersion: string
  }
  isEmulator: boolean
  isLocationMocked: boolean

Calculate:
  integrityScore = 0.0
  
  // Device sharing detection
  SELECT COUNT(DISTINCT user_id)
  FROM AttendanceRecord
  WHERE device_id = currentDevice.deviceId
    AND checked_in_at > NOW() - INTERVAL '1 hour'
  
  if (distinctUserCount > 1):
    integrityScore += 0.7  // Same device, multiple users
  
  if (isEmulator == true):
    integrityScore += 0.6  // Emulator running
  
  if (osVersion < minimumOS):
    integrityScore += 0.2  // Outdated OS
  
  if (appVersion < minimumAppVersion):
    integrityScore += 0.2  // Outdated app
  
  integrityCoefficient = min(1.0, integrityScore)

Examples:
  ├─ Real device, single user, recent app, normal OS
  │  → coeff = 0.0 (legitimate)
  ├─ Device shared by 3 users in last hour
  │  → coeff = 0.7 (suspicious)
  └─ Emulator + old app + multiple users
     → coeff = 1.0 (very suspicious)
```

### Final Score Calculation

```
locationCoeff = 0.2       (inside radius)
mockLocationCoeff = 0.0   (no mock, GPS, normal movement)
integrityCoeff = 0.1      (legit device, single user)

Weighted Score:
  score = 100 × (
    0.5 × (1 - locationCoeff) +
    0.3 × (1 - mockLocationCoeff) +
    0.2 × (1 - integrityCoeff)
  )
  
  score = 100 × (
    0.5 × (1 - 0.2) +
    0.3 × (1 - 0.0) +
    0.2 × (1 - 0.1)
  )
  
  score = 100 × (
    0.5 × 0.8 +
    0.3 × 1.0 +
    0.2 × 0.9
  )
  
  score = 100 × (0.4 + 0.3 + 0.18)
  score = 100 × 0.88
  score = 88

Result Decision:
  score >= 80  →  ✅ APPROVED
  (88 >= 80)

Final Status: "APPROVED" (approved)
```

---

## 📊 Data Models & Relationships

### Relationship Diagram

```
┌─────────────┐         1:1         ┌──────────────┐
│   Account   ├────────────────────┤    User      │
├─────────────┤                     ├──────────────┤
│ id (PK)     │                     │ id (PK)      │
│ username    │                     │ accountId(FK)│
│ password    │                     │ code         │
│ created_at  │                     │ role         │
│             │                     │ name         │
└─────────────┘                     │ created_at   │
                                    └──────┬───────┘
                                           │
                              1:N (createdBy)
                                           │
                    ┌──────────────────────┘
                    │
                    │
         ┌──────────▼──────────┐
         │ AttendanceSession   │
         ├─────────────────────┤
         │ id (PK)             │
         │ title               │
         │ latitude            │
         │ longitude           │
         │ radius              │
         │ openAt              │
         │ closeAt             │
         │ status              │
         │ createdBy (FK User) │
         │ created_at          │
         └──────────┬──────────┘
                    │
                    │ 1:N
                    │
         ┌──────────▼────────────────┐
         │ AttendanceRecord          │
         ├───────────────────────────┤
         │ id (PK)                   │
         │ userId (FK User)          │
         │ sessionId (FK Session)    │
         │ checkedInAt               │
         │ validationStatus          │
         │ validationScore           │
         │ locationAccuracy          │
         │ distance                  │
         │ deviceId                  │
         │ notes                     │
         │ created_at                │
         └───────────────────────────┘

User can participate in multiple sessions
Each session can have multiple check-in records
Each user can have multiple check-in records (one per session)
```

### SQL Relationship Queries

```sql
-- Find all sessions created by a lecturer
SELECT s.* FROM AttendanceSession s
JOIN "User" u ON s.created_by = u.id
WHERE u.id = 3 AND u.role = 'lecturer'
ORDER BY s.open_at DESC;

-- Find attendance records for a session with user details
SELECT r.*, u.name, u.code
FROM AttendanceRecord r
JOIN "User" u ON r.user_id = u.id
WHERE r.session_id = 1
ORDER BY r.checked_in_at;

-- Find flagged/suspicious check-ins
SELECT r.*, u.name, u.code, s.title
FROM AttendanceRecord r
JOIN "User" u ON r.user_id = u.id
JOIN AttendanceSession s ON r.session_id = s.id
WHERE r.validation_status = 'flagged'
  AND r.validation_score < 70
ORDER BY r.validation_score ASC;

-- Find device sharing patterns
SELECT device_id, COUNT(DISTINCT user_id) as user_count,
       STRING_AGG(DISTINCT u.name, ', ') as users
FROM AttendanceRecord r
JOIN "User" u ON r.user_id = u.id
WHERE r.checked_in_at > NOW() - INTERVAL '24 hours'
GROUP BY device_id
HAVING COUNT(DISTINCT user_id) > 1
ORDER BY user_count DESC;

-- Attendance rate per session
SELECT s.title, s.id,
       COUNT(DISTINCT r.user_id) as attended,
       COUNT(*) as total_records
FROM AttendanceSession s
LEFT JOIN AttendanceRecord r ON s.id = r.session_id
  AND r.validation_status = 'approved'
WHERE s.status = 'closed'
GROUP BY s.id, s.title
ORDER BY s.close_at DESC;
```

---

## 🔄 Module Dependencies

```
┌─────────────────┐
│   AppModule     │ (Imports all other modules)
└────────────────────────────────────┐
                                     │
         ┌───────┬───────┬───────────┼─────────┐
         │       │       │           │         │
         ▼       ▼       ▼           ▼         ▼
    ┌────────┐ ┌──────┐ ┌──────┐ ┌─────┐ ┌──────┐
    │ Config │ │ Auth │ │Users │ │ Geo │ │Common│
    │Module  │ │Module│ │Module│ │Module│ │Module│
    └────────┘ └──┬───┘ └──────┘ └─────┘ └──────┘
                  │
                  │ (exports JwtStrategy globally)
         ┌────────┘
         │
         ▼
    ┌──────────────────────┐
    │AttendanceSessionsModule│
    │ (uses JwtAuthGuard)  │
    └──────────────────────┘
         │
         │ (imports GeoModule)
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
    ┌──────────────────┐        ┌──────────────────────────┐
    │AttendanceCheckInModule    │AttendanceValidationModule│
    │ • checkIn endpoint        │ • validation checks      │
    │ • uses JwtAuthGuard       │ • scoring logic          │
    │ • imports validation      │ • integrates with Geo   │
    └──────────────────┘        └──────────────────────────┘
         │                                 │
         │ (creates records via)           │
         │                                 │
         └────────────────┬────────────────┘
                          │
                          ▼
                   ┌──────────────────┐
                   │AttendanceRecord  │
                   │Module            │
                   │ • Persistence    │
                   └──────────────────┘
                          │
                          │ (uses Prisma)
                          ▼
                   ┌──────────────────┐
                   │ PostgreSQL       │
                   │ Database         │
                   └──────────────────┘
```

---

## 🔗 Monorepo Workspace Structure

```
gps-attendance/ (root)
│
├── pnpm-workspace.yaml
│   defines workspace members:
│   - 'server/**'
│   - 'client/**'
│   - 'packages/**'
│
├── pnpm-lock.yaml
│   single lock file for all workspace packages
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── api/
│       │   │   └── response/
│       │   │       └── error_codes/
│       │   │           └── *.error-codes.ts
│       │   └── types/
│       ├── dist/  (built output)
│       ├── package.json
│       │   name: "@gps-attendance/shared"
│       └── tsconfig.json
│
├── server/
│   └── attendance/
│       ├── src/
│       │   ├── app.module.ts (root)
│       │   ├── auth/
│       │   ├── users/
│       │   ├── attendance-sessions/
│       │   ├── attendance-check-in/
│       │   ├── attendance-validation/
│       │   ├── geo/
│       │   ├── common/
│       │   └── generated/  (Prisma client)
│       ├── dist/  (built output)
│       ├── package.json
│       │   name: "@gps-attendance/attendance"
│       │   dependencies:
│       │     "@gps-attendance/shared": "workspace:*"
│       └── prisma/
│
├── client/
│   ├── mobile-client/
│   │   ├── src/
│   │   │   ├── app/     (Expo Router screens)
│   │   │   ├── components/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   └── constants/
│   │   ├── package.json
│   │   │   name: "@gps-attendance/mobile-client"
│   │   │   dependencies:
│   │   │     "@gps-attendance/shared": "workspace:*"
│   │   └── app.json  (Expo config)
│   │
│   └── admin-dashboard/
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── App.tsx
│       ├── dist/  (Vite output)
│       ├── package.json
│       │   name: "@gps-attendance/admin-dashboard"
│       │   dependencies:
│       │     "@gps-attendance/shared": "workspace:*"
│       └── vite.config.ts
│
├── docs/
│   ├── conventions/     (code standards)
│   ├── SYSTEM_OVERVIEW.md
│   └── QUICK_REFERENCE.md
│
└── root package.json
    scripts:
      dev:attendance    → pnpm --filter @gps-attendance/attendance dev
      dev:mobile        → pnpm --filter @gps-attendance/mobile-client dev
      dev:admin         → pnpm --filter @gps-attendance/admin-dashboard dev
      build:shared      → pnpm --filter @gps-attendance/shared build
```

### Workspace Link Mechanism

```
When running pnpm install at root:

1. pnpm reads pnpm-workspace.yaml
2. Resolves all member packages
3. Creates symlinks in node_modules:
   
   node_modules/
   ├── @gps-attendance/
   │   ├── shared/ → ../../packages/shared (symlink)
   │   ├── attendance/ → ../../server/attendance (symlink)
   │   ├── mobile-client/ → ../../client/mobile-client (symlink)
   │   └── admin-dashboard/ → ../../client/admin-dashboard (symlink)
   
4. All packages can import from each other:
   
   // In backend
   import { ApiResponse } from '@gps-attendance/shared'
   
   // In mobile
   import { LocationPayload } from '@gps-attendance/shared'

5. Changes to workspace:* dependencies:
   - Always use current source (not published versions)
   - No versioning needed for internal dependencies
```

---

## 🚀 Build & Watch Process

```
Command: pnpm dev:attendance

1. Execute predev hook:
   pnpm build:shared  (compile TypeScript → dist/)

2. Start server in watch mode:
   nest start --watch
   
   Watches:
   ├─ src/**/*.ts
   ├─ Changes trigger recompile + reload
   └─ Database migrations NOT auto-applied

3. Server running at http://localhost:3000

4. For changes to packages/shared/:
   pnpm dev:shared  (separate terminal)
   
   Watches:
   ├─ packages/shared/src/**/*.ts
   ├─ Rebuilds dist/ on change
   └─ Server still running, uses new dist/
```

---

## 📋 Type Safety across Workspace

```
Backend Type Usage:

import { ApiResponse, CheckInRequestPayload } from '@gps-attendance/shared'

const checkIn = async (
  dto: CheckInRequestPayload,
  user: AuthenticatedUser
): Promise<ApiResponse<AttendanceRecord>> => {
  // Type-safe DTO validation
  // Return type enforced
}


Mobile/Admin Type Usage:

import { 
  ApiResponse, 
  LocationPayload,
  CheckInRequestPayload 
} from '@gps-attendance/shared'

// Build check-in request
const payload: CheckInRequestPayload = {
  sessionId: 1,
  location: {...} as LocationPayload,
  device: {...},
  integrity: {...}
}

// API call with type-safe response
const response: ApiResponse<ValidationResult> = await http.post(
  '/attendance/check-in',
  payload
)

if (response.success) {
  console.log(response.data.validationScore)  // Type-safe
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-03  
**Purpose**: Technical architecture reference for developers
