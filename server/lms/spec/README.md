# LMS demo — Đặc tả hiện trạng

> Kiến trúc LMS production dự kiến dùng Express + PostgreSQL được mô tả tại
> [`target/README.md`](target/README.md). File này chỉ mô tả bản Deno + SQLite
> đang chạy và không phải thiết kế đích.

> Tài liệu này mô tả code đang chạy. Kế hoạch mở rộng nằm tại
> [`plans/lms-01-minimum-demo-handoff.md`](../../../plans/lms-01-minimum-demo-handoff.md).

## 1. Mục tiêu và ranh giới

LMS là một ứng dụng demo độc lập để chứng minh GPS Attendance có thể:

- Chạy độc lập với tài khoản và dữ liệu nội bộ.
- Nhận dữ liệu tổ chức, người dùng và roster từ hệ thống bên ngoài.
- Nhận yêu cầu tạo phiên qua REST mà không dùng chung database.
- Trả trạng thái và kết quả bằng khóa do hệ thống ngoài quản lý.

LMS sở hữu dữ liệu học vụ mẫu. Attendance sở hữu phiên điểm danh, GPS,
check-in, review và kết quả. Hai hệ thống không import service, repository,
Prisma client hoặc model nội bộ của nhau.

## 2. Thành phần triển khai

| Thành phần             | Công nghệ                         | Địa chỉ mặc định        |
| ---------------------- | --------------------------------- | ----------------------- |
| LMS API                | Deno 2, TypeScript, `Deno.serve`  | `http://localhost:3100` |
| LMS database           | SQLite qua `node:sqlite`          | `server/lms/lms.sqlite` |
| LMS web                | React 19, Vite                    | `http://localhost:5174` |
| Attendance integration | Mock gateway trong tiến trình LMS | Không mở port riêng     |

Vite proxy mọi request `/api` sang LMS API tại port `3100`.

## 3. Cấu trúc mã nguồn

```text
server/lms/
  src/
    attendance-summary/ # thống kê mock ổn định phục vụ phát triển UI
    auth/          # xác thực LMS web/mobile và session trong RAM
    courses/       # lớp, roster, tòa nhà và tạo phiên LMS
    database/      # repository contract, SQLite implementation, database factory
    http/          # router HTTP và contract test
    integration/   # module adapter duy nhất được phép gọi Attendance
    students/      # unit và user directory
    main.ts        # composition root
  spec/            # tài liệu bàn giao hiện trạng
  deno.json
  .env.example

client/lms-web/
  src/App.tsx      # UI và API helper hiện tại
  src/style.css
  vite.config.ts
```

`main.ts` là composition root và thực hiện dependency injection thủ công:

```text
SqliteLmsRepository
  ├── AuthService
  ├── CourseService
  └── StudentService
        └── AttendanceIntegration
              └── RealAttendanceGateway

CourseService + AttendanceIntegration + AuthService
  └── createLmsRouter
        └── Deno.serve
```

Không có DI container. Muốn đổi gateway hoặc repository, thay implementation
tại `main.ts`; service không tự khởi tạo dependency.

## 4. Mô hình dữ liệu hiện tại

SQLite tạo và seed các bảng sau khi server khởi động:

| Bảng           | Vai trò                                        |
| -------------- | ---------------------------------------------- |
| `units`        | Cây trường, khoa và lớp hành chính theo `code` |
| `users`        | Hồ sơ giảng viên/sinh viên và role hệ thống    |
| `accounts`     | Tài khoản xác thực LMS                         |
| `classes`      | Mô hình lớp học phẳng hiện tại                 |
| `enrollments`  | Quan hệ lớp–sinh viên                          |
| `buildings`    | Tòa nhà và tọa độ mẫu                          |
| `lms_sessions` | Phiên do LMS yêu cầu tạo                       |

Quan hệ chính:

```text
units.code ← users.unit_code
users.code ← accounts.user_code
classes.lecturer_code → users.code (lecturer)
enrollments.class_id → classes.id
enrollments.student_code → users.code (student)
lms_sessions.class_id → classes.id
```

SQLite schema hiện được tạo bằng `CREATE TABLE IF NOT EXISTS` và seed bằng
`INSERT OR IGNORE`; chưa có migration runner. Vertical slice hiện tại giữ
nguyên schema phẳng và không yêu cầu xóa database.

## 5. Tài khoản và role

Role dùng đúng convention của Attendance:

- `admin`: đăng nhập LMS web/API để tạo Unit và tài khoản; không sync sang
  Attendance.
- `lecturer`: giảng viên và được đăng nhập LMS web.
- `student`: sinh viên, đăng nhập mobile bằng tài khoản LMS và bị chặn trên
  LMS web.

Module integration ánh xạ `lecturer → organizer`, `student → participant` khi
gọi Attendance; LMS không lưu role Attendance như alias nội bộ.

Tài khoản demo:

```text
admin / demo123
gv001 / demo123
sv001 / demo123
```

`AuthService` cấp web session cho lecturer và cặp access/refresh token riêng
cho student mobile. Hai loại session không dùng lẫn nhau.

Web session là UUID lưu trong `Map` của tiến trình Deno. Restart LMS làm mất
toàn bộ web session. Password demo đang so sánh SHA-256, không dùng cho môi
trường thật.

## 6. HTTP API của LMS

Ngoại trừ login và preflight, mọi endpoint yêu cầu header:

```http
Authorization: Bearer <lms-token>
```

| Method | Path                                            | Chức năng                                 |
| ------ | ----------------------------------------------- | ----------------------------------------- |
| `POST` | `/api/auth/login`                               | Đăng nhập giảng viên                      |
| `GET`  | `/api/auth/me`                                  | Đọc web session hiện tại                  |
| `POST` | `/api/auth/logout`                              | Thu hồi web session                       |
| `POST` | `/api/admin/units`                              | Admin tạo Unit và sync Attendance         |
| `POST` | `/api/admin/users`                              | Admin tạo User/Account và sync Attendance |
| `POST` | `/api/admin/classes`                            | Admin tạo lớp kèm roster và sync Tag      |
| `GET`  | `/api/classes`                                  | Danh sách lớp                             |
| `GET`  | `/api/classes/:id`                              | Chi tiết lớp và roster                    |
| `GET`  | `/api/classes/:id/attendance-summary`           | Thống kê điểm danh mock của lớp           |
| `GET`  | `/api/buildings`                                | Danh sách tòa nhà                         |
| `POST` | `/api/classes/:id/sessions`                     | Tạo LMS session và gọi gateway            |
| `POST` | `/api/integration/sync`                         | Sync unit, user và course                 |
| `GET`  | `/api/integration/report`                       | Báo cáo từng integration operation        |
| `GET`  | `/api/integration/sessions/:externalId`         | Trạng thái phiên                          |
| `GET`  | `/api/integration/sessions/:externalId/records` | Kết quả điểm danh                         |
| `POST` | `/api/integration/sessions/:externalId/cancel`  | Hủy phiên                                 |

Các API cũ của LMS hiện vẫn trả JSON trực tiếp. API thống kê mới trả
`ApiResponse<ClassAttendanceSummary>` để UI có contract phân biệt success/error;
việc chuẩn hóa toàn bộ API cũ nằm ngoài thay đổi này.

## 7. Luồng nghiệp vụ giảng viên

```text
Đăng nhập
  → danh sách lớp
  → chi tiết lớp và roster
  → chọn tạo phiên điểm danh
  → chọn building tại bước tạo phiên
  → LMS resolve building thành latitude/longitude
  → tạo lms_sessions
  → gọi AttendanceGateway.createSession
  → xem trạng thái, records hoặc hủy theo externalId
```

Building không phải cấu hình cố định của lớp. Tọa độ được chụp vào LMS session
tại thời điểm tạo phiên.

## 8. Hợp đồng integration

Nguồn sự thật của giao tiếp là
[`docs/integration/integration-openapi.yaml`](../../../docs/integration/integration-openapi.yaml).

Gateway đồng bộ/điều phối phiên hiện triển khai bảy operation; adapter mobile
triển khai riêng ba operation identity/check-in:

```text
PUT  /units
PUT  /users
PUT  /tags
POST /sessions
GET  /sessions/{externalId}
GET  /sessions/{externalId}/records
POST /sessions/{externalId}/cancel
```

`RealAttendanceGateway` là implementation được inject khi chạy LMS. Nó gọi
Attendance server theo URL và API key trong môi trường. Lỗi từ API thật được
trả về caller, không fallback sang mock. `MockAttendanceGateway` chỉ dùng trong
test để router không phụ thuộc tiến trình Attendance.

### Định danh phiên

LMS tạo:

```text
externalId = "LMS-" + crypto.randomUUID()
```

Khi dùng Attendance thật:

```text
LMS externalId (string)
  ↔ IntegrationSessionLink.externalId
  ↔ IntegrationSessionLink.attendanceSessionId
  ↔ AttendanceSession.id (number)
```

Không map bằng title và không gửi ID SQLite của LMS sang Attendance. Trong mock,
session chỉ được giữ trong `Map` theo `externalId`, nên mất khi restart LMS.

## 9. Cấu hình và chạy

Copy `server/lms/.env.example` thành `.env` nếu chưa có:

```dotenv
ATTENDANCE_INTEGRATION_URL=http://localhost:3000/v1/integration
INTEGRATION_API_KEY=demo-integration-key
LMS_DATABASE_PATH=./lms.sqlite
```

Chạy hai tiến trình:

```powershell
pnpm dev:lms
pnpm dev:lms-web
```

Kiểm tra:

```powershell
cd server/lms
deno task check
deno task test

cd ../../client/lms-web
pnpm build
```

## 10. Invariant phải giữ khi phát triển tiếp

1. LMS và Attendance không dùng chung database hoặc import code nội bộ.
2. `code` là khóa nghiệp vụ người dùng; không gửi `User.id` nội bộ.
3. LMS sở hữu roster; adapter gửi snapshot `participantCodes` khi tạo phiên.
4. Attendance tự tạo ID session và ánh xạ bằng `externalId`.
5. Địa điểm được chọn lúc tạo phiên, không gắn cứng vào lớp.
6. Sinh viên tồn tại để sync/mobile nhưng không đăng nhập LMS web.
7. Gateway thật là mặc định; không fallback sang mock khi đồng bộ thất bại.
8. Thêm module trong project hiện tại; không tạo shared package mới.

## 11. Giới hạn đã biết

- `classes` chưa tách `Course`, `CourseSection` và `AcademicTerm`.
- Auth session chỉ nằm trong RAM.
- Password hashing chỉ phù hợp demo.
- Router chưa dùng `ApiResponse<T>` và error code namespaced.
- Chưa có token exchange LMS → Attendance cho mobile.
- Chưa có migration runner, webhook, retry hoặc outbox.
- `client/lms-web/src/App.tsx` còn là một component lớn.
- Lịch học, admin LMS và import Excel nằm ngoài vertical slice hiện tại.

## 12. Thứ tự tiếp tục khuyến nghị

1. Thực hiện
   [`LMS-01`](../../../plans/lms-01-minimum-demo-handoff.md) để hoàn thiện
   validation, response contract và trạng thái UI của vertical slice.
2. Bổ sung contract test tự động giữa `RealAttendanceGateway` và OpenAPI.
3. Tạo task riêng cho token exchange nếu cần mobile đăng nhập qua LMS.

## 13. Tham khảo nhánh hợp nhất

Nguồn tham khảo chính:

```text
origin/2312718_PhamNguyenNgocPhuoc_HopNhatHeThong
```

Nhánh này đưa academic core vào chung backend Attendance. Hướng hiện tại không
lặp lại kiến trúc đó, nhưng có thể port chọn lọc mô hình và quy tắc học vụ sang
LMS độc lập.

Phần tham khảo này không thuộc phạm vi LMS-01 tối thiểu. Chỉ dùng khi có task
mới yêu cầu mở rộng fake LMS sau khi vertical slice đã được nghiệm thu.

### File nên đọc

| File trong nhánh tham khảo                                                      | Giá trị có thể tái sử dụng                                                                    |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `server/attendance/prisma/schema.prisma`                                        | Quan hệ `AcademicTerm`, `Course`, `CourseSection`, `ClassEnrollment`, `TimetableSlot`, `Room` |
| `server/attendance/src/attendance-sessions/attendance-session-query.service.ts` | Quy tắc truy vấn lớp theo giảng viên, roster, tạo lớp và kiểm tra enrollment                  |
| `server/attendance/src/attendance-sessions/attendance-sessions.service.ts`      | Cách resolve section, roster, timetable và building trước khi tạo phiên                       |
| `server/attendance/src/attendance-sessions/dto/create-course-section.dto.ts`    | Validation đầu vào khi tạo lớp học phần                                                       |
| `server/attendance/src/attendance-sessions/dto/import-section-roster.dto.ts`    | Shape và giới hạn import roster                                                               |
| `server/attendance/src/attendance-sessions/dto/create-timetable-slot.dto.ts`    | Validation ca học nếu mở rộng timetable sau này                                               |
| `server/attendance/src/location-registry/location-registry.service.ts`          | Quy tắc building/room, tọa độ và trạng thái hiệu chuẩn                                        |
| `client/admin-dashboard/src/api/course-sections.api.ts`                         | Hợp đồng UI cho section, roster và timetable                                                  |
| `client/admin-dashboard/src/pages/CourseSectionsPage.tsx`                       | Luồng thao tác quản lý lớp, import roster và ca học                                           |

Có thể đọc file mà không switch branch:

```powershell
git show origin/2312718_PhamNguyenNgocPhuoc_HopNhatHeThong:server/attendance/prisma/schema.prisma

git show origin/2312718_PhamNguyenNgocPhuoc_HopNhatHeThong:server/attendance/src/attendance-sessions/attendance-session-query.service.ts

git show origin/2312718_PhamNguyenNgocPhuoc_HopNhatHeThong:client/admin-dashboard/src/pages/CourseSectionsPage.tsx
```

### Nên port sang LMS

- Mô hình `AcademicTerm`, `Course`, `CourseSection`, `ClassEnrollment`.
- Unique constraint cho course code, section theo học kỳ và enrollment.
- Kiểm tra lecturer phải có role `lecturer`.
- Kiểm tra roster chỉ gồm `student` đang active.
- Luồng danh sách lớp → chi tiết roster → tạo phiên.
- Validation ngày học kỳ, sức chứa lớp và mã học phần.
- Building như nguồn một GPS anchor và bán kính mặc định. Target spec không có
  entity Room.

Port theo repository/service của Deno LMS. Không copy lệnh Prisma hoặc inject
`PrismaService` vào project này.

### Giữ lại ở Attendance

- `AttendanceSession` và vòng đời phiên.
- `AttendanceRecord`, attempt, review và history.
- GPS/geofence validation và lecturer location verification.
- Device trust, integrity và chống gian lận.
- Redis buffer, async queue, scheduler và flush PostgreSQL.
- Mapping `externalId ↔ attendanceSessionId`.

Các phần trên là core điểm danh. Chuyển chúng sang LMS sẽ làm hai hệ thống phụ
thuộc nhau và phá khả năng Attendance chạy độc lập.

### Không copy nguyên trạng

1. `AttendanceSession.courseSectionId`, `buildingId`, `roomId` và
   `timetableSlotId` là foreign key nội bộ của kiến trúc hợp nhất. Hợp đồng
   tích hợp hiện tại chỉ gửi external code, roster và snapshot vị trí.
2. `AttendanceSessionsService.resolveSessionContext()` đọc trực tiếp academic
   tables bằng Prisma. Khi port, logic tương đương phải chạy trong LMS rồi dựng
   request `POST /v1/integration/sessions`.
3. `CourseSectionsPage.tsx` gom tạo lớp, import Excel, roster và timetable vào
   một component lớn. Chỉ lấy workflow; chia UI LMS theo module/component nhỏ.
4. Không đưa 25 model của nhánh tham khảo sang SQLite cùng lúc. Chỉ triển khai
   model nằm trong acceptance criteria của LMS-01.
5. Không dùng ID tự tăng của Course/Section/User làm integration key.

### Mapping khi port

```text
Nhánh tham khảo                       LMS độc lập
────────────────────────────────────────────────────────────────
Course.id / CourseSection.id          chỉ dùng nội bộ SQLite LMS
Course.code                           course external code
CourseSection.code                    mã lớp học phần nội bộ LMS
CourseSection.lecturerId              resolve thành lecturerCode
ClassEnrollment.userId                resolve thành studentCodes[]
Building coordinates/radius           snapshot latitude/longitude/radius
AttendanceSession.courseSectionId     không gửi sang Attendance
```

### Kiểm tra sau mỗi phần port

- LMS vẫn chạy khi Attendance server tắt.
- Mock gateway vẫn là dependency được inject trong `main.ts`.
- Không xuất hiện import từ `server/attendance` trong `server/lms`.
- Payload integration không chứa ID SQLite nội bộ.
- `deno task check`, `deno task test` và LMS web production build đều đạt.
