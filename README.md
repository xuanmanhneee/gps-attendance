# GPS Attendance System

Hệ thống điểm danh theo vị trí GPS cho sinh viên và giảng viên, xây dựng theo kiến trúc monorepo với backend NestJS, web dashboard React và mobile app Expo.

## 1. Tổng quan

Dự án nhằm hỗ trợ:
- Sinh viên điểm danh bằng vị trí GPS thực tế qua ứng dụng di động.
- Giảng viên/quản trị tạo, theo dõi và quản lý phiên điểm danh trên web dashboard.
- Phát hiện các dấu hiệu gian lận như mock location, trùng thiết bị, hoặc vị trí ngoài phạm vi cho phép.
- Tích hợp một tầng shared types để các package frontend, backend và mobile đồng bộ interface, DTO và response contract.

> Dự án đang ở giai đoạn phát triển, nhưng cấu trúc monorepo và luồng nghiệp vụ đã được tổ chức rõ ràng để mở rộng theo từng module.

## 2. Cấu trúc monorepo

```text
gps-attendance-main/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── docker-compose.yml
├── client/
│   ├── admin-dashboard/         # React + Vite dashboard cho admin/lecturer
│   └── mobile-client/           # Expo + React Native app cho sinh viên
├── packages/
│   └── shared/                  # Shared types, DTO, API response, utility contract
├── server/
│   └── attendance/              # NestJS backend API
├── docs/
│   ├── ARCHITECTURE.md
│   ├── QUICK_REFERENCE.md
│   ├── SYSTEM_OVERVIEW.md
│   ├── system-overview.md
│   └── conventions/
└── .vscode/
```

## 3. Công nghệ chính

| Phần | Công nghệ |
|---|---|
| Backend | NestJS 11, TypeScript |
| Admin dashboard | React 19, Vite, TypeScript |
| Mobile app | Expo SDK 54, React Native 0.81 |
| Shared package | TypeScript workspace package |
| Package manager | pnpm |
| Database | Prisma + PostgreSQL (cấu hình đang được chuẩn bị) |
| Authentication | JWT + Passport |

## 4. Kiến trúc hệ thống

```text
Mobile App (Expo)          Admin Dashboard (React)           Backend (NestJS)
       |                               |                               |
       |---- Login / Check-in -------->|                               |
       |                               |---- CRUD session / reports --->|
       |                               |                               |
       |<---- JWT + response ---------|                               |
       |                               |                               |
       |---- GPS + device payload -->|                               |
       |                               |                               |
       |                               |                               |-- Validate session
       |                               |                               |-- Check location/radius
       |                               |                               |-- Detect mock location
       |                               |                               |-- Save attendance record
       |                               |                               |
       |<---- Result / validation ----|                               |
```

### 4.1 Backend
Backend nằm trong `server/attendance` và có các module chính:
- `auth/` — xác thực, JWT, guard, strategy
- `users/` — profile người dùng, account và user mapping
- `attendance-sessions/` — tạo, liệt kê, lấy chi tiết session
- `attendance-check-in/` — endpoint điểm danh
- `attendance-validation/` — kiểm tra vị trí, mock location, integrity
- `attendance-record/` — lưu trữ record điểm danh
- `geo/` — tính khoảng cách GPS và kiểm tra bán kính
- `common/` — logging, filter và util chung

### 4.2 Frontend web
Dashboard nằm trong `client/admin-dashboard`:
- React Router quản lý route
- `LoginPage` và `DashboardPage` là màn hình chính hiện có
- Dùng `axios` để giao tiếp với API
- Shared package cung cấp contract cho payload và response

### 4.3 Mobile app
Mobile app nằm trong `client/mobile-client`:
- Expo Router để quản lý route
- `AuthProvider` để lưu trạng thái đăng nhập
- GPS / device metadata được thu thập tại thời điểm điểm danh
- Có các màn hình login, tab điểm danh, lịch sử, profile

### 4.4 Shared package
Package `packages/shared` chứa:
- TypeScript type dùng chung
- DTO cho API request/response
- constant error code
- interface response chuẩn hóa

## 5. Quy trình nghiệp vụ chính

### 5.1 Tạo phiên điểm danh
1. Admin/lecturer sử dụng dashboard để tạo session.
2. Session chứa thông tin: title, tọa độ tâm, bán kính, thời gian mở/đóng, người tạo.
3. Backend lưu session trong store hiện tại (prototype), có thể mở rộng sang database sau này.

### 5.2 Sinh viên điểm danh
1. Mobile app lấy vị trí GPS hiện tại.
2. App gửi `sessionId`, `location`, `device`, `integrity` lên backend.
3. Backend xác thực JWT.
4. Server kiểm tra:
   - session có đang mở không
   - vị trí có nằm trong bán kính cho phép không
   - có bị mock location không
   - thiết bị có trùng lặp, không đáng tin cậy không
5. Kết quả trả về cho client: thành công, review, hoặc từ chối.

### 5.3 Anti-fraud
Hệ thống hiện đang tích hợp logic kiểm tra chính:
- `LocationCheck` — so sánh khoảng cách GPS với radius
- `MockLocationCheck` — phát hiện `isMockLocation` và các dấu hiệu giả mạo vị trí
- `IntegrityCheck` — đánh giá device ID và dữ liệu tích hợp

Các rule này được tổ chức trong `attendance-validation` module để dễ mở rộng.

## 6. Yêu cầu môi trường

- Node.js >= 20
- pnpm 11.x (được pin ở root package.json)
- Expo Go trên điện thoại thật để test GPS
- Cần có file `.env` cho backend nếu server yêu cầu biến môi trường

## 7. Cài đặt và chạy

### 7.1 Cài dependency tại root
```bash
cd gps-attendance-main
pnpm install
```

### 7.2 Tạo file môi trường backend
```bash
copy server\attendance\.env.example server\attendance\.env
```

Kiểm tra các biến môi trường quan trọng như JWT secret trước khi chạy backend trong môi trường thật.

### 7.3 Chạy project
```bash
# Backend
pnpm dev:attendance

# Admin dashboard
pnpm dev:admin

# Mobile app
pnpm dev:mobile
```

### 7.4 Build
```bash
pnpm build:shared
pnpm build:attendance
pnpm build:admin
```

### 7.5 Clean cache/output
```bash
pnpm clean
```

## 8. Scripts root
Root `package.json` cung cấp các lệnh chính:
- `dev:attendance` — chạy backend NestJS ở chế độ watch
- `dev:admin` — chạy dashboard Vite
- `dev:mobile` — chạy Expo app
- `dev:shared` — watch build cho package shared
- `build:shared` — build package shared
- `build` — build shared + attendance + admin

## 9. Quy ước repo

Project có các tài liệu quy ước trong `docs/conventions`:
- `api-response.md` — format `ApiResponse<T>` và error codes
- `module-structure.md` — cấu trúc module NestJS và route order
- `auth-guards.md` — JWT, guard và user id semantics

Các quy ước này là nguồn tham chiếu chính khi phát triển tính năng mới.

## 10. Dự án hiện tại và điểm cần lưu ý

- Backend vẫn đang phát triển theo kiểu prototype; store hiện tại là in-memory cho session và attendance record.
- Prisma/PostgreSQL đã được cấu hình nhưng chưa hoàn thiện toàn bộ model nghiệp vụ.
- Admin dashboard đang ở mức prototype với route chính login/dashboard.
- Mobile app đang là nền tảng điều hướng và kiểm tra GPS, cần tích hợp API thực tế khi backend hoàn thiện hơn.
- Shared package là trung tâm để đồng bộ contract giữa client và server.

## 11. Tài liệu tham khảo

- `docs/system-overview.md` — tổng quan hệ thống
- `docs/ARCHITECTURE.md` — sơ đồ kiến trúc
- `docs/QUICK_REFERENCE.md` — hướng dẫn nhanh
- `docs/conventions/` — quy ước phát triển

---

Nếu bạn muốn, tôi có thể tiếp tục mở rộng tài liệu này thành:
1. mô tả chi tiết từng module backend;
2. bản thiết kế API đầy đủ từng endpoint;
3. sơ đồ ERD cho database tương lai;
4. checklist triển khai production.