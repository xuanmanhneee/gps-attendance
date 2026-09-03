# Tài liệu hệ thống GPS Attendance

## 1. Tổng quan

GPS Attendance là hệ thống điểm danh tự động theo vị trí GPS, được thiết kế cho môi trường trường học, lớp học hoặc sự kiện. Mục tiêu chính là:

- Cho phép sinh viên check-in bằng thiết bị di động trong phạm vi vị trí quy định.
- Giảm nguy cơ gian lận như giả mạo vị trí (`mock location`), điểm danh từ ngoài khu vực, hoặc dùng cùng một thiết bị cho nhiều tài khoản.
- Hỗ trợ giảng viên/quản trị viên quản lý phiên điểm danh và theo dõi kết quả.

Hệ thống đang ở giai đoạn đầu phát triển, nhưng kiến trúc đã chia rõ thành 3 phần chính:

1. Backend API (`server/attendance`) – xử lý auth, session, xác thực điểm danh và rule nghiệp vụ.
2. Admin dashboard (`client/admin-dashboard`) – giao diện cho quản trị/giảng viên.
3. Mobile client (`client/mobile-client`) – ứng dụng cho sinh viên check-in bằng GPS.
4. Shared package (`packages/shared`) – định nghĩa DTO, type, response contract dùng chung.

---

## 2. Kiến trúc tổng quan

```text
┌──────────────────────────────┐
│  Mobile Client (Expo / RN)   │
│  - login                     │
│  - lấy GPS + device info     │
│  - gửi check-in              │
└──────────────┬───────────────┘
               │ HTTP / JWT
               ▼
┌──────────────────────────────┐
│   Backend NestJS             │
│  - Auth Module               │
│  - User & Account            │
│  - Attendance Session        │
│  - Validation Service        │
│  - Geo distance logic        │
└──────────────┬───────────────┘
               │
               ├── Rules / logic: anti-spoofing, role-based access
               │
               ▼
┌──────────────────────────────┐
│  Shared types + API contract │
│  - DTOs                     │
│  - response format          │
│  - user / attendance types  │
└──────────────────────────────┘
```

### 2.1 Các thành phần chính

#### Backend (`server/attendance`)

- Dùng NestJS 11.
- Đăng ký toàn bộ module trong `AppModule`.
- Có Swagger UI tại `/api-docs`.
- Dùng ValidationPipe để validate DTO.
- Dùng ApiExceptionFilter để chuẩn hóa lỗi.

#### Admin dashboard (`client/admin-dashboard`)

- Dùng React + Vite + TypeScript.
- Có route `/login` và `/dashboard`.
- Chức năng hiện tại đang ở mức demo / prototype, chưa triển khai đầy đủ dashboard nghiệp vụ.

#### Mobile client (`client/mobile-client`)

- Dùng Expo SDK 54 + React Native.
- Dự kiến dùng GPS thực tế của thiết bị và các API của Expo để lấy tọa độ, độ chính xác và thông tin thiết bị.
- Gửi payload check-in tới backend sau khi xác thực bằng JWT.

#### Shared package (`packages/shared`)

- Dùng chung cho mọi phần:
  - type của user, attendance session, response API
  - DTO / contract để client và server đồng bộ dữ liệu
  - error codes và API wrappers

---

## 3. Cấu trúc repo

```text
gps-attendance-main/
├── client/
│   ├── admin-dashboard/        # React admin UI
│   └── mobile-client/          # Expo mobile app
├── docs/
│   ├── conventions/            # Quy ước phát triển
│   └── system-overview.md     # Tài liệu hệ thống
├── packages/
│   └── shared/                 # Kiểu dữ liệu chung
├── server/
│   └── attendance/            # Backend NestJS
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── docker-compose.yml
├── README.md
└── AGENTS.md
```

---

## 4. Người dùng và vai trò

Hệ thống có 3 vai trò chính:

### 4.1 Admin

- Tạo, theo dõi và quản lý phiên điểm danh.
- Có quyền truy cập các API quản lý session.
- Dùng JWT và `RolesGuard` để kiểm soát quyền.

### 4.2 Lecturer

- Có vai trò tương tự admin trong phạm vi tạo và xem session.
- Được phép truy cập route session theo `@Roles('admin', 'lecturer')`.

### 4.3 Student

- Đăng nhập bằng tài khoản có username là mã sinh viên / số thứ tự.
- Check-in ở đúng thời gian và vị trí được phép.
- Mỗi user có `userId`, `role`, `code` và liên kết với `accountId`.

---

## 5. Module backend chính

### 5.1 AppModule

`src/app.module.ts` là điểm khởi tạo ứng dụng. Nó import các module chính:

- `AuthModule`
- `UsersModule`
- `AttendanceSessionsModule`
- `GeoModule`
- `AttendanceValidationModule`
- `AttendanceCheckInModule`
- `LoggingModule`
- `ConfigModule.forRoot({ isGlobal: true })`

### 5.2 AuthModule

Đây là module xác thực và phân quyền:

- `LocalStrategy`: xác thực username/password qua Passport.
- `JwtStrategy`: giải mã JWT.
- `JwtAuthGuard`: bảo vệ các route cần login.
- `RolesGuard`: kiểm soát phân quyền theo vai trò.
- `AuthService`: xác thực tài khoản, map sang `AuthenticatedUser`, và issue JWT.

Token được ký với secret `JWT_SECRET` và thời hạn `1h` tại runtime.

### 5.3 UsersModule

Quản lý thông tin người dùng, role và mapping giữa:

- `Account` (credential login)
- `User` (profile + role + code + id)

Trong repo hiện tại, dữ liệu user/account đang là mock data trong `mocks/`, không dùng database thật.

### 5.4 AttendanceSessionsModule

Module này quản lý phiên điểm danh:

- `AttendanceSessionsService.create(dto, createdBy)`
- `AttendanceSessionsService.findAll()`
- `AttendanceSessionsService.findById(id)`

Mỗi session có các field chính:

- `id`
- `title`
- `latitude`, `longitude`
- `radius`
- `openAt`, `closeAt`
- `status` (`pending` | `open` | `closed`)
- `createdBy`
- `createdAt`, `updatedAt`

Lưu ý: `status` được tính động dựa trên thời gian hiện tại, không lưu cứng. Điều này giúp tránh phải chạy cron update.

### 5.5 AttendanceCheckInModule

Module chịu trách nhiệm nhận yêu cầu check-in từ mobile client.

- Controller: `POST /attendance/check-in`
- Guard: `JwtAuthGuard`
- Service: `AttendanceCheckInService.checkIn(dto, userId)`

Luồng check-in:

1. Resolve session theo `sessionId`.
2. Kiểm tra session có đang mở không.
3. Lấy record cũ trong store theo `sessionId + userId`.
4. Không tin timestamp từ client; server lấy `new Date()`.
5. Gửi dữ liệu tới `AttendanceValidationService`.

### 5.6 AttendanceValidationModule

Đây là module quan trọng nhất về anti-fraud. Các check được tách thành từng validator:

- `LocationCheck` – kiểm tra khoảng cách từ vị trí user đến tâm session.
- `MockLocationCheck` – phát hiện mock location.
- `IntegrityCheck` – đánh giá độ đáng tin của payload thiết bị / integrity.

Kết quả cuối cùng là một `status` theo quyết định score:

- `VALID`
- `REVIEW`
- `REJECTED`

Các lý do phản hồi có thể là:

- `DUPLICATE_DEVICE`
- `MOCK_LOCATION`
- `OUT_OF_RANGE`

---

## 6. Quy tắc xác thực GPS và chống gian lận

### 6.1 Vị trí trong bán kính

Backend tính khoảng cách giữa tâm phiên điểm danh và vị trí user bằng công thức Haversine.

```ts
const distance = geoService.getDistanceInMeters(
  session.latitude,
  session.longitude,
  location.latitude,
  location.longitude,
);

const isValid = distance + location.accuracy <= session.radius;
```

Nếu điểm user nằm ngoài bán kính hoặc sai số đo lạc (`accuracy`) cộng với khoảng cách vượt quá ranh giới, hệ thống đánh giá là không hợp lệ.

### 6.2 Mock location

Xét cờ `location.isMockLocation` từ client. Nếu `true`, hệ thống chặn ngay:

```ts
if (mockLocationResult.coefficient === 0) {
  return { status: 'REJECTED', reasons: ['MOCK_LOCATION'] };
}
```

### 6.3 Trùng thiết bị / trùng tài khoản

Hệ thống có logic kiểm tra `existingRecordCount`. Nếu đã có record cho cùng `sessionId + userId`, hệ thống coi là trùng/thử điểm danh lại. Mặc dù hiện tại record phụ thuộc vào in-memory store demo, đây là điểm mở cho DB thật trong tương lai.

### 6.4 Tính điểm rủi ro

Validation service dùng weighted score:

- `INTEGRITY_WEIGHT = 35`
- `MOCK_LOCATION_WEIGHT = 25`
- `LOCATION_WEIGHT = 40`

Logic:

- Nếu `score >= 80` => `VALID`
- Nếu `score >= 60` => `REVIEW`
- Nếu thấp hơn => `REJECTED`

Đây là cơ chế “đánh giá nguy cơ” chứ không phải hard-block tuyệt đối, phù hợp với mô hình trường học / lớp học.

---

## 7. API chính

### 7.1 Auth

#### `POST /v0/admin/auth/login`

- Dùng với admin / lecturer
- Body:

```json
{
  "username": "admin",
  "password": "admin"
}
```

#### `POST /v0/user/auth/login`

- Dùng với sinh viên
- Ví dụ username là mã sinh viên như `2312686`

### 7.2 Attendance sessions

#### `POST /attendance-sessions`

- Chỉ admin / lecturer
- Tạo phiên điểm danh mới

#### `GET /attendance-sessions`

- Trả về danh sách session

#### `GET /attendance-sessions/:id`

- Trả về chi tiết session

### 7.3 Check-in

#### `POST /attendance/check-in`

- Yêu cầu JWT
- Body dạng payload check-in gồm:
  - `sessionId`
  - `location`
  - `device`
  - `integrity`

### 7.4 Swagger

- Swagger UI: `/api-docs`
- Dùng để xem API contract và test nhanh các endpoint

---

## 8. Model dữ liệu chính

### Account

```ts
interface Account {
  id: number;
  username: string;
  password: string;
}
```

### User

```ts
interface User {
  id: number;
  accountId: number;
  code: string;
  role: 'admin' | 'lecturer' | 'student';
  name: string;
}
```

### AttendanceSession

```ts
interface AttendanceSession {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  openAt: Date;
  closeAt: Date;
  status: 'pending' | 'open' | 'closed';
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### AttendanceRecord

Đây là cấu trúc dữ liệu cần triển khai trong tương lai để lưu lịch sử check-in thực tế, bao gồm:

- `sessionId`
- `userId`
- `deviceId`
- `status`
- `checkedInAt`
- `latitude`, `longitude`
- `accuracy`
- `distanceMeters`

Hiện tại hệ thống đang dùng in-memory store thay cho DB thật.

---

## 9. Luồng nghiệp vụ hoàn chỉnh

### 9.1 Tạo session

1. Giảng viên/quản trị mở admin dashboard.
2. Điền thông tin session: tên, tọa độ tâm, bán kính, thời gian mở/đóng.
3. Server tạo session và map user theo `userFilter` (ví dụ theo mã sinh viên).
4. Hệ thống tạo `AttendanceRecord` placeholder cho từng user được chọn với trạng thái `absent`.

### 9.2 Sinh viên login

1. Mobile app gửi username/password.
2. `AuthService.validateUser()` tìm `Account` và `User` liên kết.
3. Nếu hợp lệ, backend trả JWT.
4. Client lưu token và dùng trong các request tiếp theo.

### 9.3 Sinh viên check-in

1. Client lấy GPS hiện tại từ thiết bị.
2. Client gửi payload bao gồm vị trí, độ chính xác, thông tin device, integrity.
3. Server xác thực JWT.
4. Server kiểm tra session đang mở.
5. Server kiểm tra khoảng cách và fake GPS.
6. Server phân loại `VALID`, `REVIEW`, hoặc `REJECTED`.
7. Kết quả trả về cho client và có thể hiển thị trên dashboard.

---

## 10. Quy ước phát triển đã định nghĩa trong repo

Repo có bộ quy tắc nằm trong `docs/conventions/`:

- `api-response.md` – định dạng phản hồi thống nhất `ApiResponse<T>`.
- `auth-guards.md` – cấu trúc JWT và `CurrentUser`.
- `module-structure.md` – cấu trúc module NestJS.
- `nameing.md` – quy ước đặt tên file/class/branch.

Những quy ước này là nguồn tham khảo quan trọng và nên tuân theo khi phát triển thêm tính năng mới.

---

## 11. Rủi ro và giới hạn hiện tại

Hệ thống hiện tại là prototype, nên cần hiểu rõ các giới hạn sau:

- Dữ liệu user / account / attendance record đang là mock/in-memory, chưa có database production.
- Admin dashboard và mobile client chưa triển khai hoàn chỉnh nghiệp vụ quản trị / báo cáo toàn diện.
- Chưa có lưu trữ lịch sử điểm danh bền vững ở tầng DB.
- Anti-fraud dựa trên logic dựa trên client payload và server-side checks, nhưng chưa có cơ chế chống spoofing mạnh mẽ như attestation / root integrity / secure enclave.

---

## 12. Hướng dẫn chạy hệ thống

Tại root repo:

```bash
pnpm install
pnpm build:shared
```

### Backend

```bash
pnpm dev:attendance
```

### Admin dashboard

```bash
pnpm dev:admin
```

### Mobile client

```bash
pnpm dev:mobile
```

### Build toàn bộ

```bash
pnpm build
```

---

## 13. Kết luận

GPS Attendance là một hệ thống điểm danh dựa trên vị trí, với trọng tâm là xác thực GPS và chống gian lận bằng cách kết hợp nhiều lớp kiểm tra: mock location, khoảng cách, sai số vị trí, và đánh giá rủi ro. Kiến trúc hiện tại đã rõ ràng theo hướng monorepo và chia tách rõ backend, frontend, và shared contract, nên rất phù hợp để mở rộng trong giai đoạn tiếp theo sang database thực, lưu trữ lịch sử, dashboard báo cáo và tích hợp mobile đầy đủ.
