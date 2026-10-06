# Cấu trúc dự án GPS Attendance

Tài liệu này tổng hợp toàn bộ cấu trúc thư mục, vai trò từng package và mối quan hệ giữa các thành phần trong monorepo.

## 1. Tổng quan

Dự án là một monorepo dùng pnpm, gồm:

- Backend NestJS: xử lý auth, điểm danh, xác thực GPS, quản lý phiên và dữ liệu
- Web dashboard: giao diện quản lý cho giảng viên/admin
- Mobile app: giao diện cho sinh viên thực hiện check-in bằng GPS
- Shared package: định nghĩa type, DTO, contract và util dùng chung
- Docs và presentation: tài liệu hệ thống, hướng dẫn và slide

```text
gps-attendance-main/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── docker-compose.yml
├── scripts/
├── docs/
├── client/
├── packages/
├── server/
├── presentation/
├── .github/
└── .vscode/
```

---

## 2. Cấu trúc monorepo

### 2.1 Root

```text
gps-attendance-main/
├── AGENTS.md                 # Quy tắc làm việc với AI/dev cho project
├── README.md                 # Tổng quan monorepo
├── package.json              # Scripts root, build/dev orchestration
├── pnpm-workspace.yaml       # Workspace config cho pnpm
├── pnpm-lock.yaml            # Lockfile chung
├── docker-compose.yml       # PostgreSQL + Redis + backend + dashboard
├── scripts/
│   └── start-ngrok.ps1      # Script expose local API qua ngrok
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SYSTEM.md
│   ├── QUICK_REFERENCE.md
│   ├── PROJECT_STRUCTURE.md  # Tài liệu cấu trúc này
│   └── conventions/
│       ├── api-response.md
│       ├── auth-guards.md
│       ├── module-structure.md
│       └── naming.md
├── client/
│   ├── admin-dashboard/
│   └── mobile-client/
├── packages/
│   └── shared/
├── server/
│   └── attendance/
├── presentation/
│   ├── slides.md
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   └── ...
└── .github/
```

### 2.2 Vai trò từng package

| Package | Mục đích | Công nghệ chính |
|---|---|---|
| `server/attendance` | API backend | NestJS, Prisma, PostgreSQL, Redis |
| `client/admin-dashboard` | Web quản trị | React, Vite, Tailwind |
| `client/mobile-client` | App sinh viên | Expo, React Native |
| `packages/shared` | Dùng chung | TypeScript types, DTO, helpers |
| `presentation` | Slide demo / trình bày | Slidev |
| `docs` | Tài liệu kỹ thuật | Markdown |
| `scripts` | Automation | PowerShell |

---

## 3. Backend: `server/attendance`

```text
server/attendance/
├── Dockerfile
├── README.md
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── prisma.config.ts
├── tsconfig.json
├── tsconfig.build.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   ├── main.ts
│   ├── account/
│   ├── auth/
│   ├── attendance-check-in/
│   ├── attendance-record/
│   ├── attendance-sessions/
│   ├── attendance-validation/
│   ├── common/
│   ├── geo/
│   ├── health/
│   ├── redis/
│   ├── tags/
│   ├── units/
│   ├── users/
│   └── prisma/
├── test/
└── coverage/
```

### 3.1 Chức năng chính của backend

- Xử lý đăng nhập, JWT và refresh token
- Phân quyền theo vai trò: student, lecturer, admin
- Tạo và quản lý các phiên điểm danh
- Kiểm tra vị trí GPS theo bán kính và thời gian mở phiên
- Chống gian lận: mock location, deviceId, số lần thử, kiểm tra tính toàn vẹn payload
- Lưu lịch sử điểm danh và báo cáo
- Health check, logging, CORS, Swagger
- Tương tác với PostgreSQL qua Prisma và Redis cho revoke token/cache

### 3.2 Các module quan trọng

| Module | Mô tả |
|---|---|
| `auth/` | Login, JWT, refresh, auth guard, role guard |
| `account/` | Quản lý tài khoản người dùng |
| `users/` | Hồ sơ người dùng, bộ lọc user và logic query |
| `units/` | Cấu trúc đơn vị, khoa, tổ chức |
| `tags/` | Tag/phân nhóm sinh viên |
| `attendance-sessions/` | Tạo và quản lý phiên điểm danh |
| `attendance-check-in/` | Check-in và logic thử lại / chặn trùng thiết bị |
| `attendance-validation/` | Xác minh vị trí và tính hợp lệ của payload |
| `attendance-record/` | Bản ghi lịch sử và điểm danh chi tiết |
| `geo/` | Tính khoảng cách Haversine, geo validation |
| `health/` | Health check cho DB và service |
| `common/` | Shared utils, filter exception, logging, request id |
| `prisma/` | Prisma client, setup và cấu hình DB |

### 3.3 Database

Backend dùng Prisma với PostgreSQL:

```text
server/attendance/prisma/
├── schema.prisma
├── seed.ts
└── migrations/
```

`schema.prisma` định nghĩa:

- User
- Account
- Role và permission
- AttendanceSession
- AttendanceRecord
- Enrollment / Section / Unit / Tag
- Device trust / location registry
- Các bảng hỗ trợ điểm danh GPS và xác minh

---

## 4. Frontend web: `client/admin-dashboard`

```text
client/admin-dashboard/
├── Dockerfile
├── README.md
├── index.html
├── nginx.conf
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── public/
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── api/
│   ├── assets/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   └── utils/
└── .env.example
```

### Chức năng web

- Đăng nhập cho lecturer/admin
- Quản lý phiên điểm danh
- Xem danh sách sinh viên và lịch sử điểm danh
- Theo dõi hiệu suất và trạng thái phiên
- Giao diện dùng React + Vite + TypeScript

### Các nhóm thư mục chính

| Thư mục | Vai trò |
|---|---|
| `src/api` | Client gọi API backend |
| `src/pages` | Các màn hình chính |
| `src/components` | Reusable components |
| `src/routes` | Cấu hình đường dẫn/route |
| `src/services` | Logic nghiệp vụ client |
| `src/context` | Context API/auth state |
| `src/hooks` | Custom hooks |

---

## 5. Mobile app: `client/mobile-client`

```text
client/mobile-client/
├── app.json
├── README.md
├── STRUCTURE.md
├── package.json
├── metro.config.js
├── tsconfig.json
├── eslint.config.js
├── expo-env.d.ts
├── assets/
│   ├── expo.icon/
│   └── images/
├── scripts/
│   └── reset-project.js
├── src/
│   ├── app/
│   ├── api/
│   ├── components/
│   ├── constants/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   └── global.css
├── theme/
│   ├── colors.ts
│   ├── index.ts
│   ├── spacing.ts
│   └── typography.ts
└── .env.example
```

### Chức năng mobile

- Đăng nhập sinh viên
- Xem phiên điểm danh và lịch trình học
- Check-in bằng GPS theo vị trí và bán kính
- Xem lịch sử điểm danh và hồ sơ cá nhân
- Tích hợp Expo Router, location services và secure storage

### Cấu trúc app

- `src/app`: màn hình và routes theo Expo Router
- `src/api`: API client cho backend
- `src/context`: trạng thái auth và data state
- `src/services`: nghiệp vụ, location, hồ sơ sinh viên
- `src/hooks`: hook tùy chỉnh
- `src/components`: reusable UI components

---

## 6. Shared package: `packages/shared`

```text
packages/shared/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── api/
│   ├── types/
│   ├── constants/
│   ├── utils/
│   └── errors/
```

Package này đảm nhận:

- định nghĩa type dùng chung giữa frontend/backend
- DTO và contract API
- error code chuẩn hóa
- helper liên quan đến auth, response model, validation
- tránh phụ thuộc lẫn nhau và duplicate interface

---

## 7. Cấu hình runtime và triển khai

### 7.1 Docker Compose

`docker-compose.yml` quản lý:

| Service | Port | Chức năng |
|---|---:|---|
| `postgres` | `5432` | Cơ sở dữ liệu PostgreSQL |
| `redis` | `6379` | Cache / blacklist token |
| `backend` | `3000` | API NestJS |
| `admin-dashboard` | `8080` | Dashboard build static |

### 7.2 Chạy dự án

Tại root:

```bash
pnpm install
```

Script chính:

```bash
pnpm dev:attendance
pnpm dev:admin
pnpm dev:mobile
pnpm build
```

Các script này được định nghĩa trong root `package.json` và gọi vào từng package tương ứng.

---

## 8. Luồng dữ liệu toàn hệ thống

```text
Sinh viên/giảng viên/admin
        │
        ├── Web dashboard (React)
        │     └── gọi API backend qua JWT / Bearer token
        │
        ├── Mobile app (Expo)
        │     └── gửi GPS + payload + deviceId + thời gian check-in
        │
        └── Backend NestJS
              ├── Auth module
              ├── Session module
              ├── Check-in module
              ├── Validation module
              ├── Prisma DB
              └── Redis for blacklist / cache
```

### Luồng điểm danh điển hình

1. Giảng viên/admin tạo phiên điểm danh.
2. Hệ thống lưu thông tin GPS center, radius và thời gian mở phiên.
3. Sinh viên đăng nhập và lấy JWT.
4. Sinh viên gửi check-in cùng tọa độ, thời gian và metadata thiết bị.
5. Backend kiểm tra:
   - phiên đang mở
   - user thuộc roster / phân bổ hợp lệ
   - vị trí trong bán kính
   - không vượt giới hạn thử lại
   - không trùng thiết bị / không mock location
6. Backend ghi `AttendanceRecord` và cập nhật trạng thái điểm danh.

---

## 9. Kết luận

Dự án này có cấu trúc monorepo rõ ràng, chia thành 3 lớp chính:

- Lớp dữ liệu và nghiệp vụ: `server/attendance`
- Lớp giao diện người dùng: `client/admin-dashboard`, `client/mobile-client`
- Lớp contract dùng chung: `packages/shared`

Mỗi phần đều có vai trò riêng, nhưng cùng tạo thành một hệ thống điểm danh GPS theo mô hình xác thực, phản hồi real-time và quản lý dữ liệu tập trung.
