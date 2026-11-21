# Phạm vi và kiến trúc

## 1. Mục tiêu sản phẩm

LMS cung cấp một backend học vụ bình thường và có thể chạy độc lập. Tích hợp
Attendance là một feature adapter, không chi phối cấu trúc các feature còn lại.

Luồng chính phải hoàn chỉnh:

```text
Admin tạo Unit và User
  → tạo học kỳ và môn học
  → tạo lớp học phần kèm roster
  → giảng viên xem lớp và lịch
  → giảng viên tạo phiên với vị trí hiện tại
  → outbox tự đồng bộ sang Attendance
  → sinh viên đăng nhập mobile bằng LMS và điểm danh
  → giảng viên xem thống kê theo lớp/sinh viên
```

## 2. Công nghệ

| Thành phần | Lựa chọn |
|---|---|
| Runtime | Node.js LTS |
| HTTP | Express 5 |
| Language | TypeScript strict |
| Database | PostgreSQL |
| ORM/migration | Prisma |
| Validation | Zod nếu workspace đã có; nếu chưa, dùng validation hiện có của project |
| Auth | Access JWT ngắn hạn + refresh session lưu database |
| Password | Argon2id hoặc thư viện hash password đã được project chọn |
| Test | Test runner hiện có của workspace + PostgreSQL test database |
| Deployment | Docker Compose riêng service LMS và PostgreSQL LMS |

Không thêm message broker cho bản đầu. Outbox worker chạy trong tiến trình LMS,
dùng PostgreSQL làm hàng đợi bền vững.

## 3. Bounded contexts

```text
LMS
├── Identity             account, password, refresh session
├── Organization         user, unit
├── Academic             term, course, section, enrollment
├── Facilities           campus và building GPS anchor
├── Timetable            weekly/date-specific slot và building mapping
├── AttendanceIntegration mapper, outbox, gateway, mobile proxy
└── Reporting            thống kê điểm danh theo lớp/sinh viên

Attendance
├── Session lifecycle
├── GPS/geofence
├── Check-in and anti-fraud
├── Review
└── Attendance records
```

Feature LMS không được gọi repository của feature khác. Giao tiếp nội bộ qua
application service hoặc read port được feature sở hữu.

## 4. Cấu trúc source

```text
server/lms/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── create-app.ts
│   │   ├── config.ts
│   │   ├── error-handler.ts
│   │   └── composition-root.ts
│   ├── common/
│   │   ├── api-response.ts
│   │   ├── clock.ts
│   │   ├── pagination.ts
│   │   └── transaction.ts
│   └── modules/
│       ├── identity/
│       ├── organization/
│       ├── academic/
│       ├── facilities/
│       ├── timetable/
│       ├── attendance-integration/
│       └── reporting/
├── test/
├── Dockerfile
└── package.json
```

Mỗi module dùng cùng một layout:

```text
<feature>/
├── domain/
│   ├── <feature>.model.ts
│   ├── <feature>.errors.ts
│   └── <feature>.repository.ts
├── application/
│   ├── <use-case>.service.ts
│   └── <use-case>.types.ts
├── infrastructure/
│   └── prisma-<feature>.repository.ts
├── http/
│   ├── <feature>.controller.ts
│   ├── <feature>.routes.ts
│   └── <feature>.schemas.ts
└── index.ts
```

Chỉ tạo abstraction có điểm thay thế thật:

- Repository interface: có Prisma implementation và test implementation.
- Attendance gateway: có HTTP implementation và fake trong test.
- Statistics provider: có mock và Attendance implementation.
- Clock: dùng cho token, outbox và test thời gian.

Không tạo interface cho controller, mapper thuần hoặc hàm không có alternative.

## 5. Dependency rule

```text
HTTP → Application → Domain
Infrastructure ────────┘
Composition root nối implementation vào port
```

- Domain không import Express, Prisma hoặc module khác.
- Application không truy cập `PrismaClient` trực tiếp.
- Infrastructure không chứa quyết định phân quyền hay nghiệp vụ.
- HTTP chỉ parse/validate request, gọi application service và map response.
- `composition-root.ts` là nơi duy nhất khởi tạo concrete repository/gateway.
- Không có barrel export toàn bộ nội bộ module; `index.ts` chỉ export public API.

## 6. Transaction

Các use case sau phải chạy trong một database transaction:

- Tạo User + Account + outbox event.
- Tạo CourseSection + Enrollment + outbox event.
- Thay roster + outbox event.
- Tạo session request + outbox event.
- Hủy session request + outbox event.

`TransactionManager.run(callback)` truyền transaction context cho repository.
Không mở transaction trong controller hoặc HTTP gateway.

## 7. Request lifecycle

Thứ tự middleware:

1. Request ID.
2. Security headers và CORS allowlist.
3. JSON body limit.
4. Access log đã che password/token.
5. Authentication.
6. Feature router và authorization.
7. Not-found handler.
8. Error handler trả `ApiResponse`.

Endpoint public duy nhất của core MVP: login, refresh và health. Các endpoint
khác yêu cầu JWT hoặc được bảo vệ bởi API key ở ranh giới integration.

## 8. Khả năng chạy độc lập

Khi Attendance tắt:

- Auth, user, unit, academic, timetable và UI LMS vẫn hoạt động.
- Mutation vẫn commit vào PostgreSQL.
- Integration status hiển thị `pending` hoặc `failed`.
- Worker retry sau; người dùng không phải gửi lại mutation.
- Mobile vẫn đăng nhập và xem hồ sơ LMS; thao tác cần Attendance trả lỗi dịch
  vụ tạm thời, không giả dữ liệu thành công.

## 9. Quan sát vận hành

- `GET /health/live`: tiến trình còn sống, không query dependency.
- `GET /health/ready`: kiểm tra PostgreSQL; Attendance không quyết định LMS ready.
- Log JSON có `requestId`, `userCode`, `feature`, `operation`, `durationMs`.
- Log integration có `outboxEventId`, `attempt`, `endpoint`, `status`; không log
  API key, JWT, password hoặc toàn bộ roster.
