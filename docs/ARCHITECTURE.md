# Kiến trúc dự án GPS Attendance

## 1. Tổng quan kiến trúc

Dự án GPS Attendance được tổ chức theo mô hình monorepo với 3 nền tảng chính:
- backend API trên NestJS
- dashboard web trên React + Vite
- mobile app trên Expo + React Native
- shared package dùng chung cho types và contract

## 2. Lớp kiến trúc và trách nhiệm

```text
┌─────────────────────────────────────────────┐
│            Client Layer                     │
│  - Mobile app (Expo / React Native)        │
│  - Admin dashboard (React / Vite)          │
└─────────────────────────────────────────────┘
                     │
                     │ HTTP + JWT
                     ▼
┌─────────────────────────────────────────────┐
│            API Layer (NestJS)               │
│  Auth / Users / Sessions / Check-in        │
│  Validation / Geo / Attendance Records     │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│         Data / Persistence Layer           │
│  Prisma schema + PostgreSQL (planned/partial)│
│  In-memory stores in prototype phases      │
└─────────────────────────────────────────────┘
```

## 3. Mối quan hệ giữa các phần

### Mobile app
- Lấy vị trí GPS của sinh viên
- Gửi yêu cầu check-in với JWT
- Hiển thị kết quả điểm danh và lịch sử

### Dashboard web
- Dành cho lecturer/admin
- Tạo session và xem chi tiết
- Tương tác với API session và auth

### Backend API
- Xác thực người dùng
- Kiểm tra session đang mở
- Tính khoảng cách từ vị trí đến tâm session
- Áp dụng anti-fraud validation
- Lưu sự kiện điểm danh

## 4. Module backend chính

```text
server/attendance/src/
├── app.module.ts
├── auth/
├── users/
├── account/
├── attendance-sessions/
├── attendance-check-in/
├── attendance-validation/
├── attendance-record/
├── geo/
├── common/
└── main.ts
```

### Các module cụ thể
- `auth`: login, JWT, guards, role-based access
- `users`: thông tin người dùng và truy vấn dữ liệu user
- `attendance-sessions`: CRUD session
- `attendance-check-in`: `POST /attendance/check-in`
- `attendance-validation`: validate vị trí và độ tin cậy
- `attendance-record`: lịch sử điểm danh
- `geo`: tính khoảng cách GPS

## 5. Luồng check-in

```text
Sinh viên mở app
    ↓
App lấy location + device info
    ↓
Gửi POST /attendance/check-in với JWT
    ↓
Backend xác thực token
    ↓
Kiểm tra session hợp lệ và đang mở
    ↓
Tính khoảng cách đến tâm session
    ↓
Phát hiện mock-location và integrity issue
    ↓
Trả về approved/review/rejected
```

## 6. Luồng auth

```text
Client -> Login endpoint
    ↓
Backend validate username/password
    ↓
Generate JWT
    ↓
Client gửi Bearer token trên request cần bảo vệ
    ↓
JwtAuthGuard xác thực
```

## 7. Quy ước response

Dự án dùng chuẩn `ApiResponse` từ shared package:

```ts
{
  success: true,
  data: { ... }
}
```

và lỗi:

```ts
{
  success: false,
  code: 'ERROR_CODE',
  message: 'Mô tả lỗi'
}
```

## 8. Database và dữ liệu

Schema Prisma hiện có cơ sở dữ liệu mục tiêu dựa trên các model:
- `Account`
- `User`
- `AttendanceSession`
- `AttendanceRecord`
- `AttendanceAttempt`

Tuy nhiên, trong giai đoạn hiện tại, nhiều phần của dự án vẫn đang dùng mock/in-memory store để phát triển nhanh.

## 9. Điểm cần lưu ý về trạng thái hiện tại

- Backend đang làm việc với nhiều module rõ ràng nhưng chưa hoàn toàn kết nối database thật.
- Dashboard và mobile app có kiến trúc cơ bản, đủ để phát triển tiếp.
- Shared package là trung tâm để kiểm soát contract kiểu dữ liệu giữa các phần.
- Dự án đang trong giai đoạn chuyển từ prototype sang phần mềm có thể triển khai thực tế.

## 10. Tài liệu liên quan

- [../README.md](../README.md)
- [../docs/system-overview.md](system-overview.md)
- [../docs/QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- [../docs/conventions](conventions)

Step 1: Login
┌──────────────┐
│ Mobile/Admin │
└────┬─────────┘
     │ POST /auth/login
     │ { username, password }
     │
     ▼
┌──────────────────────────┐
│  AuthService.login()     │
│  • Hash password         │
│  • Compare with DB       │
│  • Validate credentials  │
└────┬─────────────────────┘
     │ Found → Generate JWT
     │ payload: {
     │   userId: 5,
     │   role: 'student',
     │   iat: 1234567890,
     │   exp: 1234654290
     │ }
     │
     ▼
┌──────────────────────────┐
│  Return JWT Token        │
│  "eyJhbGciOiJIUzI1NiIs" │
└────┬─────────────────────┘
     │
     ▼
┌──────────────┐
│ Client store │ (secure storage on mobile)
│ token        │
└──────────────┘

Step 2: Authenticated Request
┌──────────────────────────────┐
│ GET /users/me                │
│ Authorization:               │
│   Bearer eyJhbGciOiJIUzI1NiIs│
└────┬─────────────────────────┘
     │
     ▼
┌────────────────────────────┐
│ JwtAuthGuard               │
│ • Extract token from header│
│ • Verify signature         │
│ • Check expiration         │
│ • Decode payload           │
└────┬───────────────────────┘
     │ Valid
     │ Extract: userId, role, ...
     │
     ▼
┌──────────────────────────┐
│ @CurrentUser() decorator │
│ Returns: { userId, role }│
└────┬─────────────────────┘
     │
     ▼
┌────────────────────┐
│ Route handler      │
│ can access user    │
│ context            │
└────────────────────┘

Step 3: Permission Checks
If route protected by @Roles('lecturer', 'admin'):
┌─────────────────────────────────┐
│ RolesGuard                       │
│ • Extract user role from token  │
│ • Check against @Roles() array  │
│ • Allow or reject               │
└─────────────────────────────────┘
```

---

## 🛡️ Validation Scoring Deep Dive

### Location Check Algorithm

```
Input:
  user_location = (lat_user, lon_user)
  session_location = (lat_session, lon_session)
  session_radius = 50 meters

Calculate:
  distance = Haversine(
    (lat_user, lon_user),
    (lat_session, lon_session)
  )
  // Returns distance in meters

  locationCoefficient = min(1.0, distance / radiusLimit)
  
  Examples:
  ├─ distance = 10m, radius = 50m
  │  → coeff = 10/50 = 0.2 (inside, low coefficient)
  ├─ distance = 50m, radius = 50m
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
