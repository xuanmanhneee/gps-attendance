# GPS Attendance System

**Người biên soạn và phụ trách tài liệu: Phạm Nguyễn Ngọc Phước**

> README này mô tả hệ thống theo mã nguồn hiện có trong repository: mục tiêu, thành phần, sơ đồ, use case, cách cấu hình, chạy, kiểm thử và các giới hạn đã biết. Tài liệu không thay thế API Swagger hoặc hướng dẫn chi tiết của từng package.

## Mục lục

1. [Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
2. [Cấu trúc hệ thống](#2-cấu-trúc-hệ-thống)
3. [Sơ đồ tổng quan](#3-sơ-đồ-tổng-quan)
4. [Sơ đồ user flow](#4-sơ-đồ-user-flow)
5. [Sơ đồ use case theo chức năng](#5-sơ-đồ-use-case-theo-chức-năng)
6. [Chức năng theo vai trò](#6-chức-năng-theo-vai-trò)
7. [Công nghệ và dữ liệu](#7-công-nghệ-và-dữ-liệu)
8. [Cài đặt và thực thi](#8-cài-đặt-và-thực-thi)
  - [8.7. Benchmark tải chức năng check-in](#87-benchmark-tải-chức-năng-check-in)
9. [API, cấu hình và vận hành](#9-api-cấu-hình-và-vận-hành)
10. [Bảo mật, giới hạn và lưu ý](#10-bảo-mật-giới-hạn-và-lưu-ý)
11. [Tài liệu liên quan](#11-tài-liệu-liên-quan)

---

## 1. Giới thiệu tổng quan

GPS Attendance là hệ thống điểm danh cho môi trường học tập. Ứng dụng gồm mobile cho sinh viên, dashboard web cho giảng viên/quản trị viên và backend API dùng chung. Dữ liệu nghiệp vụ được lưu bằng PostgreSQL thông qua Prisma.

Mỗi phiên điểm danh gắn với lớp học phần, giảng viên, lịch học, thời gian mở/đóng và vị trí/tòa nhà đã cấu hình. Sinh viên được phân bổ vào phiên sẽ gửi vị trí GPS cùng thông tin thiết bị để backend đánh giá lượt điểm danh. Kết quả có thể là hợp lệ, cần xem xét hoặc bị từ chối.

| Vai trò | Giao diện chính | Nhiệm vụ |
|---|---|---|
| Sinh viên (`student`) | Mobile Expo | Đăng nhập, xem lịch và phiên được phân công, điểm danh GPS, xem lịch sử/thông báo, cập nhật hồ sơ |
| Giảng viên (`lecturer`) | Dashboard web; một số luồng đăng nhập cũng có trên mobile | Xem lớp được phân công, tạo/quản lý phiên của mình, xem roster và kết quả, xử lý lượt cần xem xét |
| Quản trị viên (`admin`) | Dashboard web | Quản lý phiên, lớp học phần, roster, lịch học, địa điểm/tòa nhà/phòng và độ tin cậy thiết bị |

### Phạm vi nghiệp vụ hiện có

- Đăng nhập bằng username/password; backend kiểm tra mật khẩu đã băm bằng bcrypt và phân quyền qua JWT.
- Quản lý hồ sơ người dùng, đơn vị (`Unit`), thẻ (`Tag`) và các tiêu chí chọn sinh viên.
- Tạo lớp học phần, học kỳ, ghi danh và lịch học định kỳ hoặc buổi học theo ngày cụ thể.
- Nhập danh mục học phần và danh sách sinh viên từ CSV/XLSX. Roster cập nhật hồ sơ, email theo MSSV, ngày sinh, giới tính, lớp/khóa; tài khoản mới mặc định dùng MSSV làm username nếu file thiếu username và dùng MSSV làm mật khẩu. Với roster chi tiết, mật khẩu các tài khoản sinh viên đã có trong danh sách cũng được đặt lại thành MSSV.
- Quản lý Location Registry gồm campus, building và room; chỉ dùng vị trí building đã xác minh khi tạo phiên.
- Điểm danh GPS với khoảng cách Haversine, kiểm tra mock location, thiết bị trùng, giới hạn số lần thử và đánh giá integrity evidence.
- Xem lịch sử, thống kê, chi tiết bản ghi/attempt; giảng viên/quản trị viên có thể duyệt hoặc từ chối lượt cần xem xét.
- Audit log, device trust, health check, logging, rate limit và API Swagger.
- Ghi nhớ phiên đăng nhập trên mobile: nếu được chọn, app giữ token/user trong SecureStore (native) hoặc localStorage (web); ứng dụng không lưu mật khẩu.

---

## 2. Cấu trúc hệ thống

Đây là monorepo pnpm. Backend, các client và package chia sẻ contract dùng workspace root. Presentation Slidev là workspace riêng.

```text
gps-attendance-main/
├── README.md
├── package.json                    # Lệnh chạy/build ở root
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── docker-compose.yml              # PostgreSQL, Redis, backend, dashboard
├── client/
│   ├── admin-dashboard/            # React/Vite: giảng viên và quản trị viên
│   │   ├── src/
│   │   │   ├── api/                # API client
│   │   │   ├── components/         # Modal, bảng, điều hướng và UI dùng chung
│   │   │   ├── context/            # Trạng thái đăng nhập web
│   │   │   ├── hooks/
│   │   │   └── pages/              # Login, dashboard, phiên, địa điểm, lớp học phần
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   └── mobile-client/              # Expo/React Native: app sinh viên
│       └── src/
│           ├── app/                # Expo Router: tabs, login, profile, attendance
│           ├── api/
│           ├── components/
│           ├── context/
│           ├── hooks/
│           └── services/           # Session/token, device ID và storage
├── packages/
│   └── shared/                     # Types, API response, HTTP client, error codes
├── server/
│   └── attendance/                 # NestJS API
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── src/
│       │   ├── auth/ account/ users/
│       │   ├── attendance-sessions/
│       │   ├── attendance-check-in/
│       │   ├── attendance-validation/
│       │   ├── attendance-record/
│       │   ├── location-registry/ device-trust/
│       │   ├── health/ common/ prisma/ redis/
│       │   └── units/ tags/ geo/
│       └── test/                   # E2E tests
├── docs/
│   └── SYSTEM.md                   # Mô tả kỹ thuật hệ thống
└── presentation/                   # Slidev; workspace/lockfile riêng
```

### Trách nhiệm theo package

| Package | Vai trò |
|---|---|
| `server/attendance` (`@gps-attendance/attendance`) | REST API, xác thực/phân quyền, nghiệp vụ điểm danh, Prisma, migration và seed |
| `client/admin-dashboard` (`@gps-attendance/admin-dashboard`) | Dashboard quản lý và theo dõi phiên, roster, lịch học, địa điểm |
| `client/mobile-client` (`@gps-attendance/mobile-client`) | Ứng dụng di động, GPS check-in, lịch, lịch sử, thông báo và hồ sơ |
| `packages/shared` (`@gps-attendance/shared`) | Contract TypeScript dùng chung giữa backend và client |
| `presentation/` | Slidev presentation, cài và chạy độc lập với workspace root |

---

## 3. Sơ đồ tổng quan

```mermaid
flowchart LR
  Student[ Sinh viên ] --> Mobile[Mobile Expo]
  Staff[Giảng viên] --> Dashboard[Admin Dashboard]
  Admin[Quản trị viên] --> Dashboard

  Mobile -->|REST API và JWT| API[Backend NestJS]
  Dashboard -->|REST API và JWT| API
  Shared[Shared types và API contracts] -. dùng chung .-> Mobile
  Shared -. dùng chung .-> Dashboard
  Shared -. dùng chung .-> API

  API -->|Prisma| DB[(PostgreSQL)]
  API -->|Token blacklist và dữ liệu vận hành| Redis[(Redis)]
  Mobile -->|GPS, thiết bị, phiên đăng nhập| Device[Thiết bị di động]
  Dashboard -->|CSV và XLSX| Files[File import/export]
```

### Hạ tầng khi chạy bằng Docker Compose

| Thành phần | Cổng mặc định | Công dụng |
|---|---:|---|
| PostgreSQL 16 | `5432` | Lưu tài khoản, lớp, lịch, phiên và dữ liệu điểm danh |
| Redis 7 | `6379` | Hỗ trợ blacklist/thu hồi token và dữ liệu vận hành |
| Backend NestJS | `3000` | REST API, health endpoint, Swagger |
| Nginx dashboard | `8080` trên host | Phục vụ web dashboard đã build |
| Mobile Expo | Không chạy trong Compose | Chạy riêng; kết nối backend qua LAN hoặc HTTPS tunnel |

Sơ đồ thể hiện luồng logic. Mobile và dashboard không kết nối trực tiếp PostgreSQL/Redis; mọi thao tác nghiệp vụ đi qua backend API.

---

## 4. Sơ đồ user flow

```mermaid
flowchart TD
  Start([Bắt đầu]) --> Choose{Vai trò đăng nhập}

  Choose -->|Sinh viên| StudentLogin[Đăng nhập trên mobile]
  StudentLogin --> StudentAuth{Thông tin hợp lệ}
  StudentAuth -->|Không| LoginError[Hiện lỗi đăng nhập]
  LoginError --> StudentLogin
  StudentAuth -->|Có| StudentHome[Trang điểm danh]
  StudentHome --> ViewSchedule[Xem lịch và phiên được giao]
  ViewSchedule --> SelectSession[Chọn phiên đang mở]
  SelectSession --> GetLocation[Xin quyền và lấy GPS]
  GetLocation --> SendCheckin[Gửi vị trí, thiết bị và evidence]
  SendCheckin --> Evaluate[Backend kiểm tra phiên, roster, GPS và rủi ro]
  Evaluate --> Result{Kết quả}
  Result -->|VALID| MarkPresent[Ghi nhận điểm danh]
  Result -->|REVIEW| NeedsReview[Đưa vào danh sách cần xem xét]
  Result -->|REJECTED| Rejected[Hiện lý do từ chối]
  MarkPresent --> HistoryStudent[Xem lịch sử và thông báo]
  NeedsReview --> HistoryStudent
  Rejected --> SelectSession
  StudentHome --> EditProfile[Cập nhật hồ sơ]
  StudentHome --> LogoutStudent[Đăng xuất]

  Choose -->|Giảng viên hoặc quản trị| StaffLogin[Đăng nhập dashboard]
  StaffLogin --> StaffAuth{Thông tin và quyền hợp lệ}
  StaffAuth -->|Không| StaffLoginError[Hiện lỗi đăng nhập]
  StaffLoginError --> StaffLogin
  StaffAuth -->|Có| StaffDashboard[Dashboard]
  StaffDashboard --> PrepareData[Chuẩn bị lớp, roster, lịch và địa điểm]
  PrepareData --> CreateSession[Tạo phiên điểm danh]
  CreateSession --> SessionActive[Theo dõi phiên và sinh viên]
  SessionActive --> ReviewAttempts[Duyệt attempt cần xem xét]
  SessionActive --> ExportReport[Xuất báo cáo CSV]
  StaffDashboard --> ManageLocation[Quản lý building, room và xác minh]
  StaffDashboard --> LogoutStaff[Đăng xuất]
```

Luồng chính từ khâu chuẩn bị học phần đến điểm danh:

1. Quản trị viên tạo học phần/lớp, gán giảng viên, nhập roster và thiết lập lịch học.
2. Quản trị viên đăng ký và xác minh vị trí building; phòng được liên kết với building phù hợp.
3. Giảng viên chọn lớp/lịch đã sẵn sàng và tạo phiên.
4. Backend snapshot enrollment active thành các attendance record ban đầu.
5. Sinh viên mở phiên trên mobile, gửi GPS/device evidence trong khung giờ hợp lệ.
6. Giảng viên/quản trị viên theo dõi kết quả, xử lý lượt review và xuất báo cáo.

---

## 5. Sơ đồ use case theo chức năng

Các sơ đồ use case dưới đây được biểu diễn bằng Mermaid flowchart để hoạt động trong GitHub/Markdown preview; mỗi sơ đồ gom các hành động người dùng theo một miền chức năng.

### 5.1. Tài khoản và hồ sơ

```mermaid
flowchart LR
  Student[ Sinh viên ] --> LoginStudent((Đăng nhập student))
  Student --> Remember((Ghi nhớ phiên đăng nhập))
  Student --> ReadProfile((Xem hồ sơ cá nhân))
  Student --> UpdateProfile((Cập nhật hồ sơ))
  Student --> LogoutStudent((Đăng xuất))

  Lecturer[Giảng viên] --> LoginStaff((Đăng nhập staff))
  Admin[Quản trị viên] --> LoginStaff
  LoginStaff --> CheckRole((Kiểm tra role và cấp JWT))
  LoginStudent --> CheckRole
  CheckRole --> AccountService[Auth và Account service]
  ReadProfile --> UserService[Users service]
  UpdateProfile --> UserService
  LogoutStudent --> RevokeToken((Thu hồi token))
  RevokeToken --> Redis[(Redis)]
```

### 5.2. Học phần, lớp, roster và lịch học

```mermaid
flowchart LR
  Admin[Quản trị viên] --> ImportCourses((Nạp danh mục học phần))
  Admin --> CreateSection((Tạo lớp học phần))
  Admin --> ImportRoster((Nạp roster CSV hoặc XLSX))
  Admin --> UpdateStudent((Cập nhật hồ sơ và tài khoản sinh viên))
  Admin --> SetCapacity((Đặt sức chứa lớp tối đa 300))
  Admin --> CreateTimetable((Tạo lịch định kỳ hoặc lịch theo ngày))
  Admin --> EditTimetable((Sửa hoặc xóa lịch))
  Lecturer[Giảng viên] --> ViewSections((Xem lớp được phân công))
  Lecturer --> ViewRoster((Xem roster lớp))

  ImportCourses --> CourseService[Course và CourseSection service]
  CreateSection --> CourseService
  ImportRoster --> EnrollmentService[Import và ClassEnrollment]
  UpdateStudent --> EnrollmentService
  SetCapacity --> EnrollmentService
  CreateTimetable --> TimetableService[TimetableSlot service]
  EditTimetable --> TimetableService
  ViewSections --> CourseService
  ViewRoster --> EnrollmentService
```

### 5.3. Phiên điểm danh, check-in và kết quả

```mermaid
flowchart LR
  Lecturer[Giảng viên] --> CreateSession((Tạo phiên từ lớp và lịch))
  Lecturer --> MonitorSession((Theo dõi phiên))
  Lecturer --> ReviewAttempt((Duyệt hoặc từ chối attempt))
  Admin[Quản trị viên] --> CreateSession
  Admin --> MonitorSession
  Admin --> ReviewAttempt
  Admin --> CloseSession((Đóng hoặc hủy phiên))
  Student[Sinh viên] --> ViewAssigned((Xem phiên được giao))
  Student --> GPSCheckin((Gửi điểm danh GPS))
  Student --> ViewHistory((Xem lịch sử và thống kê))

  CreateSession --> SessionService[Attendance Sessions]
  ViewAssigned --> SessionService
  GPSCheckin --> CheckinService[Check-in và anti-fraud]
  CheckinService --> Validation[GPS, mock location và integrity]
  Validation --> Record[(Attendance Record)]
  ReviewAttempt --> SessionService
  ViewHistory --> RecordService[Attendance Records]
  CloseSession --> SessionService
  MonitorSession --> SessionService
```

### 5.4. Địa điểm, thiết bị và xác minh

```mermaid
flowchart LR
  Admin[Quản trị viên] --> CampusUse((Xem campus))
  Admin --> BuildingUse((Tạo hoặc cập nhật building))
  Admin --> VerifyBuilding((Cập nhật GPS và xác minh building))
  Admin --> RoomUse((Tạo hoặc liên kết room))
  Admin --> TrustDevice((Trust hoặc block thiết bị))
  Lecturer[Giảng viên] --> ViewLocations((Xem địa điểm))
  Lecturer --> VerifyOwnLocation((Gửi bằng chứng vị trí giảng viên))
  Student[Sinh viên] --> SubmitDevice((Gửi thông tin thiết bị khi check-in))

  CampusUse --> Registry[Location Registry]
  BuildingUse --> Registry
  VerifyBuilding --> Registry
  RoomUse --> Registry
  ViewLocations --> Registry
  VerifyOwnLocation --> Verification[Lecturer Location Verification]
  SubmitDevice --> DeviceTrust[Device Trust và integrity]
  TrustDevice --> DeviceTrust
```

### 5.5. Vận hành, báo cáo và bảo trì

```mermaid
flowchart LR
  Admin[Quản trị viên] --> Analytics((Xem thống kê chuyên cần))
  Admin --> Export((Xuất báo cáo CSV))
  Admin --> Health((Kiểm tra sức khỏe API))
  Admin --> Audit((Tra cứu lịch sử thao tác))
  Lecturer[Giảng viên] --> Analytics
  Lecturer --> Export
  Lecturer --> ReviewHistory((Xem attempt và history))
  Developer[Nhà phát triển] --> Migrate((Quản lý migration))
  Developer --> Seed((Nạp dữ liệu development))
  Developer --> Tests((Chạy test và build))

  Analytics --> AttendanceAPI[Attendance API]
  Export --> Dashboard[Admin Dashboard]
  ReviewHistory --> AttendanceAPI
  Health --> Monitoring[Health và Monitoring]
  Audit --> AuditLog[(AuditLog)]
  Migrate --> Prisma[Prisma]
  Seed --> Prisma
  Tests --> CI[Build và test scripts]
```

---

## 6. Chức năng theo vai trò

### Sinh viên — mobile

- Đăng nhập qua `POST /v0/user/auth/login`.
- Có thể bật **Ghi nhớ đăng nhập** để khôi phục phiên khi mở app lại; không lưu mật khẩu.
- Xem phiên/lịch được phân bổ, lấy vị trí hiện tại và thực hiện check-in.
- Xem lịch sử, thống kê chuyên cần, notification/reminder trong app.
- Xem và cập nhật hồ sơ cá nhân.
- Đăng xuất; app xóa phiên local và backend hỗ trợ thu hồi token.

### Giảng viên — dashboard

- Đăng nhập qua `POST /v0/admin/auth/login`; backend chỉ chấp nhận `lecturer` hoặc `admin` ở endpoint này.
- Xem lớp được phân công và roster active.
- Tạo phiên từ lớp/lịch học đã cấu hình, theo dõi trạng thái phiên và kết quả điểm danh.
- Xem attempts, duyệt/từ chối kết quả cần xem xét; đóng, hủy hoặc xóa phiên theo quyền.
- Xem thống kê và xuất bảng điểm danh CSV.
- Gửi xác minh vị trí giảng viên theo endpoint được bảo vệ.

### Quản trị viên — dashboard

- Quản lý danh mục môn/lớp học phần, giảng viên và phòng theo các luồng hiện có.
- Import danh sách học phần và roster CSV/XLSX; nâng capacity lớp hiện có tối đa 300.
- Tạo/sửa/xóa lịch định kỳ theo thứ hoặc một buổi học cụ thể theo ngày.
- Quản lý campus/building/room; cập nhật tọa độ, radius, accuracy, trạng thái xác minh.
- Quản lý phiên và xử lý attempt theo quyền; xem analytics, lịch sử và audit.
- Cập nhật trust/block cho thiết bị.

### Quy trình check-in ở backend

1. Xác nhận phiên tồn tại và đang mở.
2. Kiểm tra sinh viên đã được phân bổ vào phiên và chưa điểm danh thành công.
3. Ghi attempt; giới hạn số lần thử và kiểm tra device trùng.
4. Tính khoảng cách đến tâm geofence bằng Haversine; xét accuracy, mock location và integrity evidence.
5. Trả `VALID`, `REVIEW` hoặc `REJECTED` cùng lý do; lượt được chấp nhận được ghi nhận để hiển thị trong lịch sử/chi tiết phiên.

> Integrity evidence hiện được đánh giá ở backend; việc có trường token không tự chứng minh chữ ký Play Integrity/App Attest đã được xác minh với dịch vụ provider.

---

## 7. Công nghệ và dữ liệu

### Công nghệ

| Lớp | Công nghệ |
|---|---|
| Backend | Node.js 20+, NestJS 11, TypeScript, Passport, JWT, bcrypt |
| Dữ liệu | Prisma 7, PostgreSQL 16, Redis |
| Web | React 19, Vite 8, React Router, Tailwind CSS |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router, expo-location, expo-secure-store |
| Shared | TypeScript package `@gps-attendance/shared` |
| Công cụ | pnpm 11, Jest, Swagger, Winston, Docker Compose, Nginx |

### Các miền dữ liệu chính

| Miền | Model/nhóm dữ liệu |
|---|---|
| Danh tính | `Account`, `User`, `Unit`, `Tag`, `UserTag` |
| Học vụ | `Course`, `AcademicTerm`, `CourseSection`, `ClassEnrollment`, `TimetableSlot` |
| Địa điểm | `Campus`, `Building`, `Room` |
| Điểm danh | `AttendanceSession`, `AttendanceRecord`, `AttendanceAttempt`, `AttendanceHistoryEvent` |
| Bảo mật/vận hành | `RegisteredDevice`, `DeviceIntegrityCheck`, `LecturerLocationVerification`, `AuditLog` |
| Thông báo | `Notification`, `UserNotificationState`, `PushToken` |

`schema.prisma` và các migration trong `server/attendance/prisma/` là nguồn xác định field, relation và constraint hiện tại. Mật khẩu không lưu dạng rõ; seed chỉ áp dụng cho môi trường development.

---

## 8. Cài đặt và thực thi

Các lệnh dưới đây dành cho PowerShell trên Windows từ thư mục gốc `gps-attendance-main`.

### 8.1. Yêu cầu

- Node.js `>= 20`
- pnpm `11.x` (repository chỉ định `pnpm@11.12.0`)
- PostgreSQL 16 và Redis 7 (local hoặc Docker Compose)
- Expo Go hoặc thiết bị phù hợp để kiểm thử GPS mobile
- Ngrok chỉ cần khi dùng script/tunnel ngrok

### 8.2. Cài dependencies và cấu hình môi trường

```powershell
pnpm.cmd install

Copy-Item server\attendance\.env.example server\attendance\.env
Copy-Item client\admin-dashboard\.env.example client\admin-dashboard\.env
Copy-Item client\mobile-client\.env.example client\mobile-client\.env
```

Điền giá trị local phù hợp:

- Backend: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `CORS_ORIGIN`, Redis host/port và mật khẩu seed admin/giảng viên nếu cần.
- Dashboard: `VITE_API_BASE_URL`.
- Mobile: `EXPO_PUBLIC_API_URL`. Trên điện thoại thật, dùng IP LAN hoặc URL HTTPS; không dùng `localhost` của máy phát triển.

Không commit các file `.env` hoặc secret thực. Không dùng secret mặc định của Compose ngoài môi trường local an toàn.

### 8.3. Khởi động PostgreSQL/Redis và thiết lập schema

Sau khi cấu hình container engine, từ root:

```powershell
docker compose up -d postgres redis
```

Kiểm tra `DATABASE_URL` trỏ đúng database. Chạy migration đã có:

```powershell
pnpm.cmd --filter @gps-attendance/attendance exec prisma migrate deploy
pnpm.cmd --filter @gps-attendance/attendance exec prisma migrate status
```

Khi phát triển schema trên database development và cần tạo migration mới, dùng `prisma migrate dev` theo hướng dẫn trong [README Prisma](server/attendance/src/prisma/README.md). **Không chạy `prisma migrate reset` trên database chứa dữ liệu cần giữ.**

Nạp dữ liệu mẫu development:

```powershell
pnpm.cmd seed:attendance
```

Seed được cấu hình trong `server/attendance/prisma/seed.ts`, chỉ chạy development. Tài khoản sinh viên mẫu dùng MSSV làm mật khẩu; admin/giảng viên có thể cấu hình qua `SEED_ADMIN_PASSWORD` và `SEED_LECTURER_PASSWORD`. Không dùng credentials mẫu ngoài môi trường development.

### 8.4. Chạy các ứng dụng ở chế độ phát triển

Mở các terminal riêng tại root:

```powershell
pnpm.cmd dev:attendance
pnpm.cmd dev:admin
pnpm.cmd dev:mobile
```

- `dev:attendance` build shared, gọi script ngrok rồi chạy NestJS watch. Cần cài và xác thực ngrok. Nếu không cần tunnel, chạy local trực tiếp:

  ```powershell
  pnpm.cmd build:shared
  pnpm.cmd --filter @gps-attendance/attendance dev
  ```

- `dev:admin` build shared rồi chạy Vite dashboard, thường tại `http://localhost:5173`.
- `dev:mobile` build shared rồi khởi chạy Expo.
- `pnpm.cmd dev:shared` bật watch build shared.
- `pnpm.cmd dev:ngrok` chỉ chạy script cấu hình/cập nhật tunnel.

### 8.5. Build, kiểm thử và công cụ package

```powershell
pnpm.cmd build:shared
pnpm.cmd build:attendance
pnpm.cmd build:admin
pnpm.cmd build

pnpm.cmd --filter @gps-attendance/attendance test
pnpm.cmd --filter @gps-attendance/attendance test:e2e
pnpm.cmd --filter @gps-attendance/mobile-client exec tsc --noEmit
```

Root `pnpm build` build shared, backend và dashboard; mobile được khởi chạy/build riêng bởi Expo.

Một số lệnh riêng:

```powershell
pnpm.cmd dev:mobile:clear
pnpm.cmd dev:mobile:offline
pnpm.cmd --filter @gps-attendance/attendance test:watch
pnpm.cmd --filter @gps-attendance/attendance test:cov
pnpm.cmd --filter @gps-attendance/attendance lint
pnpm.cmd --filter @gps-attendance/mobile-client lint
```

Lưu ý: script lint backend hiện chạy ESLint với `--fix`, tức có thể sửa file nguồn.

### 8.6. Chạy toàn bộ stack bằng Compose

Khi đã có Docker/Compose và đã cấu hình environment:

```powershell
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

Dashboard được phục vụ tại `http://localhost:8080`; API tại `http://localhost:3000`; health tại `http://localhost:3000/v0/health`; Swagger tại `http://localhost:3000/api-docs`. Mobile không phải service Compose và vẫn cần chạy Expo riêng.

### 8.7. Benchmark tải chức năng check-in

#### Mục tiêu

Đo khả năng xử lý của `POST /v0/attendance/check-in` khi nhiều tài khoản sinh viên mô phỏng cùng gửi một lượt điểm danh. Benchmark giúp tìm mức tải đã kiểm chứng đạt SLA và quan sát điểm latency bắt đầu tăng mạnh; đây không phải phép đo người dùng thật hay cam kết năng lực production.

| Chỉ số đánh giá | Ngưỡng benchmark |
|---|---:|
| p95 latency của check-in | `< 1.000 ms` |
| Lỗi kỹ thuật (transport/status 0 hoặc HTTP 5xx) | `< 1%` |
| Check-in được chấp nhận | Đủ một lượt cho mỗi VU |
| HTTP 429 | `0` |
| Từ chối nghiệp vụ trong fixture hợp lệ | `0` |

#### Vai trò và thành phần

| Thành phần/vai trò | Trách nhiệm |
|---|---|
| Người vận hành | Dùng database test riêng, khởi động dịch vụ, chọn số VU và theo dõi health/tài nguyên |
| Seeder | Tạo 350 tài khoản student mô phỏng, session đang mở, attendance records, JWT và payload fixture |
| k6 | Mỗi VU dùng một fixture/tài khoản và gửi đúng một request check-in |
| Backend NestJS | Xác thực JWT, kiểm tra session/record, GPS/device/integrity và ghi attendance/attempt |
| PostgreSQL | Lưu user, account, session, attendance record và evidence của lượt thử |
| Redis | Phục vụ các phần token/runtime của backend |

Mã nguồn chính: [checkin-burst.js](tests/load/checkin-burst.js), [load-seed.ts](server/attendance/test/load-seed.ts), [hướng dẫn tải](tests/load/README.md).

#### Input

| Input | Mô tả |
|---|---|
| `BASE_URL` | URL API, benchmark local dùng `http://127.0.0.1:3000` |
| `CHECKIN_FIXTURES` | JSON có ít nhất `MAX_VUS` fixture; mỗi fixture có JWT và payload riêng |
| `MAX_VUS` | Mức concurrent VU cần thử; không lớn hơn số fixture |
| `RAMP_VUS`, `RAMP_DURATION` | Mức tải khởi đầu và thời gian ramp, mặc định 10 VU/15 giây |
| `SPIKE_DURATION`, `HOLD_DURATION`, `COOLDOWN_DURATION` | Thời gian tăng tới target, giữ tải và hạ tải; mặc định 10/30/10 giây |
| `P95_MS`, `TECHNICAL_ERROR_RATE` | Ngưỡng SLA, mặc định 1.000 ms và 0,01 |

Mỗi fixture theo đúng DTO backend: `sessionId` là số nguyên; `location` có latitude, longitude, accuracy, epoch timestamp, `isMockLocation`; `device` có `deviceId`, platform, model; `integrity.integrityToken` có thể null. Seeder tạo tọa độ nằm trong geofence, thiết bị khác nhau cho từng tài khoản và JWT hợp lệ. Không dùng chung token/device giữa các VU.

#### Output

- `checkin_accepted`: số kết quả `VALID` hoặc `REVIEW`; phải bằng hoặc lớn hơn số VU mục tiêu.
- `checkin_latency`: phân bố latency của request check-in, đặc biệt p95.
- `checkin_technical_error_rate`: tỷ lệ transport error/HTTP 5xx; không gộp lỗi nghiệp vụ vào lỗi kỹ thuật.
- `checkin_rate_limited` và `checkin_business_rejected`: phải bằng 0 trong bài đo capacity với fixture hợp lệ.
- `http_reqs`/`http_req_duration`: tổng request, throughput trung bình và độ trễ theo báo cáo k6.
- `--summary-export`: ghi báo cáo JSON local; fixture và kết quả `*.local.json` đã được Git ignore.

Không dùng `iterations` làm số check-in: sau request đầu tiên, mỗi VU sleep và không gửi lại POST. Chỉ số request/accepted phản ánh số lượt điểm danh thực tế.

#### Điều kiện và cách hoạt động

- Dùng k6 `v2.3.0`, API NestJS local, PostgreSQL/Redis Docker và database riêng `gps_attendance_loadtest`; database này đã được migrate 19 migration.
- Rate limit chỉ được nới/bỏ guard khi đồng thời có `NODE_ENV=test`, `LOAD_TEST_MODE=true` và database đúng tên `gps_attendance_loadtest`. Bootstrap từ chối bật chế độ này với database khác. Không giả mạo IP, không seed hoặc chạy benchmark vào production.
- Profile mặc định: ramp lên 10 VU trong 15 giây, ramp tiếp tới `MAX_VUS` trong 10 giây, giữ 30 giây, rồi ramp về 0 trong 10 giây. Mỗi VU gửi một check-in khi bắt đầu; thời điểm gửi được phân bố theo ramp, không phải tất cả trong cùng một mili-giây.
- Một lượt đo kéo dài khoảng 65,7 giây. RPS trong bảng là trung bình trên toàn lượt gồm ramp-up/ramp-down; đây không phải peak RPS của riêng đoạn spike.
- Seeder tạo session mới mỗi lần chạy và không xóa dữ liệu cũ. Sau khi xác nhận database test, dùng lại session mới cho mỗi lượt để tránh check-in trùng; giữ fixture/summary để đối chiếu.

#### Quy trình thực hiện

1. Cài Docker/Compose và k6; cấu hình `server/attendance/.env` với JWT secret local không phải placeholder.
2. Mở **Terminal A** tại thư mục gốc, khởi động PostgreSQL/Redis, tạo database test lần đầu, sau đó migrate, seed và chạy API bằng biến môi trường test.
3. Chờ API sẵn sàng tại `http://127.0.0.1:3000/v0/health`; xác nhận database connected và migration applied.
4. Mở **Terminal B** tại thư mục gốc, đặt biến k6 và chạy profile ở mức VU cần đo.
5. Đọc summary: trước hết xét `checkin_accepted`, p95, lỗi kỹ thuật, 429 và business rejection; sau đó đối chiếu health/RAM/CPU/DB. Tăng VU theo nấc, tạo session mới cho từng lượt.
6. Sau benchmark, dừng API bằng `Ctrl+C` và dừng Redis nếu đã khởi động riêng. Không xóa database/attendance evidence để “reset” kết quả.

#### Số liệu thực tế

| VU | Accepted | p95 | Trung bình req/s | Kết quả SLA |
|---:|---:|---:|---:|---|
| 50 | 50 | 146,77 ms | 0,76 | Đạt |
| 100 | 100 | 106,66 ms | 1,52 | Đạt |
| 200 | 200 | 37,45 ms | 3,04 | Đạt |
| 300 | 300 | 530,18 ms | 4,56 | Đạt |
| 312 | 312 | 40,00 ms | 4,75 | Đạt |
| 313 | 313 | 32,48 ms | 4,76 | Đạt |
| 315 | 315 | 1,13 s | 4,79 | Trượt p95 |
| 318 | 318 | 1,14 s | 4,84 | Trượt p95 |
| 325 | 325 | 3,81 s | 4,94 | Trượt p95 |
| 350 | 350 | 7,82 s | 5,32 | Trượt p95 |

Tất cả các nấc trong bảng có 0 lỗi kỹ thuật, 0 HTTP 429 và 0 từ chối nghiệp vụ. Ở 350 VU, backend vẫn nhận đủ check-in nhưng latency vượt SLA.

**Kết luận:** mức cao nhất đã xác nhận đạt trong các nấc đo là 313 VU; 315 VU là nấc đầu tiên trong dải gần đó bị trượt. 314 VU chưa đo, do đó đây không phải cực đại chính xác hay cam kết production. Kết quả p95 biến động đáng kể giữa một số nấc; nên benchmark lại trên staging gần production và lặp nhiều lần trước khi công bố capacity ổn định.

#### Tài nguyên và lưu ý kết quả

- Snapshot sau nấc 350 ghi nhận health `ok`, PostgreSQL `connected`, API RSS khoảng `251 MB`, heap `106 MB`, RAM hệ thống sử dụng `92%` so với khoảng `87%` ban đầu. Đây là snapshot sau test, không phải biểu đồ mức dùng RAM/CPU theo thời gian; CPU time-series và peak RPS chưa được thu thập.
- Lượt 350 đầu tiên có lỗi script `sleep is not defined`; p95 `291,35 ms` ở log đó **không dùng làm kết quả**. Sau khi sửa import `sleep`, lượt 350 hợp lệ có p95 `7,82 s` như bảng.
- Summary JSON và fixture local nằm dưới `tests/load/` với hậu tố `.local.json` và được Git ignore. Seeder không xóa dữ liệu; mỗi lần chạy tạo session/evidence mới. Dữ liệu database `gps_attendance_loadtest` được giữ lại để đối chiếu, không phải dữ liệu production.
- Kết quả tải còn phụ thuộc cấu hình máy, PostgreSQL, Redis, load generator và phiên bản runtime; không ngoại suy trực tiếp thành capacity của hệ thống production.

#### Lệnh thực thi PowerShell

Chạy phần chuẩn bị trong **Terminal A**. Lệnh `createdb` chỉ chạy lần đầu; nếu database đã tồn tại thì giữ nguyên, không drop/reset.

```powershell
docker compose up -d postgres redis
$pgUser = (docker compose exec -T postgres printenv POSTGRES_USER | Out-String).Trim()
docker compose exec -T postgres createdb -U $pgUser gps_attendance_loadtest

$env:NODE_ENV = 'test'
$env:LOAD_TEST_MODE = 'true'
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/gps_attendance_loadtest'
pnpm --filter @gps-attendance/attendance exec prisma migrate deploy
pnpm --filter @gps-attendance/attendance exec tsx test/load-seed.ts
pnpm --filter @gps-attendance/attendance dev
```

Nếu thông tin PostgreSQL local khác mặc định Compose, sửa user/password trong `DATABASE_URL` cho khớp. Khi API đã chạy, đặt `MAX_VUS` không vượt quá 350 và chạy trong **Terminal B**. Ví dụ benchmark mức cao nhất đã xác nhận đạt:

```powershell
$env:BASE_URL = 'http://127.0.0.1:3000'
$env:CHECKIN_FIXTURES = 'checkin-fixtures.local.json'
$env:MAX_VUS = '313'
$env:RAMP_VUS = '10'
$env:RAMP_DURATION = '15s'
$env:SPIKE_DURATION = '10s'
$env:HOLD_DURATION = '30s'
$env:COOLDOWN_DURATION = '10s'
$env:P95_MS = '1000'
$env:TECHNICAL_ERROR_RATE = '0.01'
k6 run tests/load/checkin-burst.js --summary-export=tests/load/result-spike-313vu.local.json
```

---

## 9. API, cấu hình và vận hành

### API chính

Các API nghiệp vụ được version dưới `/v0`. Xem endpoint, DTO, role guard và response cụ thể trong [README backend](server/attendance/README.md) hoặc Swagger runtime.

| Nhóm | Một số endpoint | Vai trò chính |
|---|---|---|
| Auth | `POST /v0/user/auth/login`, `POST /v0/admin/auth/login`, refresh/logout tương ứng | Student hoặc lecturer/admin |
| Profile | `GET/PATCH /v0/users/me` | Người dùng đã xác thực |
| Session | `/v0/attendance-sessions` và các route `/:id`, `/mine`, `/me`, `/analytics` | Student, lecturer, admin theo quyền |
| Course/roster/timetable | `/v0/attendance-sessions/sections/...`, `/courses/import` | Chủ yếu admin; roster xem theo quyền lớp |
| Check-in | `POST /v0/attendance/check-in` | Student |
| Attendance history | `/v0/attendance/records/...` | Người dùng đã xác thực và phạm vi dữ liệu |
| Location | `/v0/location-registry/...` | Lecturer/admin xem; admin thay đổi cấu hình |
| Device trust | `/v0/admin/devices/:id/trust` | Admin |
| Health | `GET /v0/health` | Health/monitoring |

### Cấu hình mạng

- Dashboard đọc `VITE_API_BASE_URL`.
- Mobile đọc `EXPO_PUBLIC_API_URL`; khởi động lại Metro/Expo sau khi đổi env.
- Backend đọc `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, JWT secrets, Redis config và các biến seed.
- Khi dùng ngrok, client phải trỏ đúng URL tunnel và backend/database phía sau tunnel phải là môi trường muốn dùng.

### Quan sát và chẩn đoán

- Backend ghi log JSON qua Winston và gắn request ID.
- `GET /v0/health` kiểm tra database, migration và tài nguyên hệ thống.
- Swagger cung cấp schema API đang chạy.
- PostgreSQL và Redis Compose dùng named volumes. Không xóa volume nếu cần giữ dữ liệu.
- API trả `401 Invalid credentials` thường có nghĩa là username/password không khớp với database mà chính backend đang sử dụng; kiểm tra đúng `DATABASE_URL` và đúng server trước khi chạy seed.

---

## 10. Bảo mật, giới hạn và lưu ý

- Backend phân biệt endpoint student và admin/staff; quyền cuối cùng do guard/service backend kiểm soát, không chỉ do giao diện.
- Password được hash bằng bcrypt; access/refresh token được lưu an toàn trên mobile native qua SecureStore. Checkbox “Ghi nhớ đăng nhập” lưu phiên chứ không lưu password.
- Mật khẩu MSSV chỉ thuận tiện cho tài khoản sinh viên development/import theo yêu cầu nghiệp vụ, dễ đoán; người dùng nên đổi sang mật khẩu riêng khi có luồng đổi mật khẩu phù hợp.
- Mobile cần quyền vị trí để check-in. Giả lập GPS, sai số, khoảng cách ngoài geofence, device reuse và số attempt đều có thể ảnh hưởng kết quả.
- Integrity token được đánh giá bởi logic ứng dụng hiện tại; không ghi nhận là xác minh chữ ký provider nếu chưa tích hợp xác minh đó.
- Một số API phụ/legacy cần được đánh giá quyền trước khi expose vào môi trường không tin cậy; xem phần security trong README backend.
- Tạo phiên cần dữ liệu lớp, roster, lịch và building đã cấu hình/xác minh phù hợp.
- Migration/seed chỉ tác động database theo `DATABASE_URL`. Nếu mobile dùng URL ngrok trỏ tới backend khác, seed database local sẽ không đổi mật khẩu trên backend từ xa đó.
- Hệ thống không chạy mobile trong Docker Compose. GPS thực tế nên được kiểm thử trên thiết bị và môi trường địa điểm phù hợp.

---

## 11. Tài liệu liên quan

| Tài liệu | Nội dung |
|---|---|
| [README backend](server/attendance/README.md) | Module NestJS, API, database, seed, migration, test và giới hạn backend |
| [README dashboard](client/admin-dashboard/README.md) | Trang/component web, thao tác quản lý lớp, roster, phiên và địa điểm |
| [README mobile](client/mobile-client/README.md) | Route Expo, GPS, auth, token storage và lệnh mobile |
| [README shared](packages/shared/README.md) | Types, API contracts và error codes |
| [README Prisma](server/attendance/src/prisma/README.md) | Schema, migration và seed |
| [SYSTEM.md](docs/SYSTEM.md) | Mô tả kiến trúc, domain, API và quy tắc nghiệp vụ chi tiết |
| [README presentation](presentation/README.md) | Slidev presentation và workspace riêng |

---

**Tài liệu được biên soạn và duy trì bởi Phạm Nguyễn Ngọc Phước.**
