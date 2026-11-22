# Mô hình dữ liệu PostgreSQL

## 1. Quy ước chung

- Primary key nội bộ dùng UUID và không gửi sang Attendance.
- `code` là khóa nghiệp vụ, trim và chuẩn hóa uppercase trước khi lưu đối với
  user, unit, course và section.
- Mọi bảng nghiệp vụ có `createdAt`, `updatedAt`.
- Thời điểm dùng `timestamptz`; ngày học kỳ dùng `date`; giờ ca học dùng số phút
  từ 0 đến 1439 để so sánh đơn giản.
- Xóa dữ liệu đã được tham chiếu bằng soft state (`active`, `archived`) thay vì
  cascade delete.

## 2. Quan hệ tổng thể

```text
Unit 1 ── * User 1 ── 0..1 Account 1 ── * RefreshSession
                    ├── * CourseSection (lecturer)
                    └── * Enrollment (student)

AcademicTerm 1 ── * CourseSection * ── 1 Course
CourseSection 1 ── * Enrollment
CourseSection 1 ── * TimetableSlot * ── 0..1 Building * ── 1 Campus
CourseSection 1 ── * IntegrationSessionRequest

OutboxEvent độc lập và tham chiếu aggregate bằng aggregateType + aggregateId
```

## 3. Identity và organization

### Unit

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `code` | varchar(50) | unique, required |
| `name` | varchar(150) | required |
| `parentId` | UUID nullable | FK `Unit.id`, không được trỏ chính nó |
| `active` | boolean | default true |

Không cho chuyển Unit vào một hậu duệ của chính nó. Không deactivate Unit nếu
còn User active trừ khi request xác nhận chuyển user trước.

### User

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `code` | varchar(50) | unique, required, immutable |
| `fullName` | varchar(150) | required |
| `email` | varchar(254) nullable | unique khi có giá trị |
| `role` | enum | `ADMIN`, `LECTURER`, `STUDENT` |
| `unitId` | UUID | FK `Unit.id` |
| `active` | boolean | default true |

Không lưu role Attendance trong bảng này.

### Account

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `userId` | UUID | unique FK `User.id` |
| `username` | varchar(100) | unique theo lowercase |
| `passwordHash` | text | required |
| `passwordChangedAt` | timestamptz | required |
| `failedLoginCount` | integer | default 0 |
| `lockedUntil` | timestamptz nullable | |

### RefreshSession

Chỉ lưu hash refresh token, không lưu token rõ. Có `expiresAt`, `revokedAt`,
`lastUsedAt`, `userAgent` rút gọn và `deviceName` tùy chọn. Rotation thu hồi
session cũ trong cùng transaction tạo session mới.

## 4. Academic core

### AcademicTerm

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `code` | varchar(30) | unique, ví dụ `2026-HK1` |
| `name` | varchar(100) | required |
| `startDate` | date | required |
| `endDate` | date | `endDate >= startDate` |
| `status` | enum | `DRAFT`, `ACTIVE`, `CLOSED` |

Chỉ một term được `ACTIVE` nếu sản phẩm chọn chính sách một học kỳ hiện hành.
Thiết kế không bắt buộc constraint này để vẫn xem được dữ liệu chồng kỳ.

### Course

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `code` | varchar(30) | unique |
| `name` | varchar(200) | required |
| `credits` | smallint nullable | 1..20 khi có |
| `owningUnitId` | UUID | FK `Unit.id` |
| `active` | boolean | default true |

### CourseSection

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `code` | varchar(50) | required |
| `name` | varchar(200) | required |
| `courseId` | UUID | FK `Course.id` |
| `termId` | UUID | FK `AcademicTerm.id` |
| `lecturerId` | UUID | FK `User.id`, role lecturer |
| `capacity` | integer nullable | > 0 khi có |
| `status` | enum | `DRAFT`, `ACTIVE`, `CLOSED`, `ARCHIVED` |

Unique `(termId, code)`. `capacity = null` nghĩa là không đặt giới hạn, không
dùng một con số mặc định ẩn.

### Enrollment

| Field | Type | Constraint |
|---|---|---|
| `courseSectionId` | UUID | composite PK, FK |
| `studentId` | UUID | composite PK, FK User |
| `status` | enum | `ACTIVE`, `DROPPED` |
| `enrolledAt` | timestamptz | required |
| `droppedAt` | timestamptz nullable | chỉ có khi dropped |

Chỉ User role student được enroll. Roster dùng enrollment `ACTIVE`; không xóa
lịch sử enrollment khi sinh viên rút lớp.

## 5. Facilities

Facility chuẩn hóa Campus và Building để lọc lịch, đồng thời cung cấp một GPS
anchor và bán kính mặc định cho mỗi Building.

### Campus

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `code` | varchar(30) | unique |
| `name` | varchar(150) | required |
| `address` | varchar(300) nullable | chỉ để hiển thị |
| `active` | boolean | default true |

### Building

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `campusId` | UUID | FK Campus |
| `code` | varchar(30) | unique trong Campus |
| `name` | varchar(150) | required |
| `latitude` | decimal(9,6) | tọa độ tâm xấp xỉ của tòa |
| `longitude` | decimal(9,6) | tọa độ tâm xấp xỉ của tòa |
| `defaultRadiusMeters` | integer | bán kính mặc định, trong giới hạn Attendance |
| `active` | boolean | default true |

Unique `(campusId, code)`. Tọa độ Building là anchor chung cho toàn tòa.

## 6. Timetable

### TimetableSlot

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `courseSectionId` | UUID | FK section |
| `kind` | enum | `WEEKLY` hoặc `DATE` |
| `dayOfWeek` | smallint nullable | 1..7, chỉ dùng cho WEEKLY |
| `scheduledDate` | date nullable | chỉ dùng cho DATE |
| `startMinute` | smallint | 0..1439 |
| `endMinute` | smallint | lớn hơn startMinute |
| `buildingId` | UUID nullable | FK Building |
| `buildingLabelSnapshot` | varchar(200) nullable | tên đầy đủ tại lúc tạo |

Check constraint đảm bảo WEEKLY chỉ có `dayOfWeek`, DATE chỉ có
`scheduledDate`. `scheduledDate` phải nằm trong học kỳ của section; rule này
được kiểm tra trong application service.

`buildingLabelSnapshot` có dạng `Campus / Tòa` và giữ lịch sử nếu danh mục được
đổi tên. UI chọn `buildingId`; application service tự sinh snapshot.

## 7. Attendance integration

### IntegrationSessionRequest

LMS lưu yêu cầu đã tạo để hiển thị trạng thái đồng bộ; đây không phải bản sao
AttendanceSession.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK nội bộ |
| `externalId` | UUID/string | unique, gửi sang Attendance |
| `courseSectionId` | UUID | section nguồn |
| `title` | varchar(200) | tiêu đề phiên |
| `latitude` | decimal(9,6) | vị trí chọn lúc tạo |
| `longitude` | decimal(9,6) | vị trí chọn lúc tạo |
| `radiusMeters` | integer | giới hạn do Attendance contract quy định |
| `locationSource` | enum | `BUILDING`, `CURRENT`, `MAP` |
| `sourceBuildingId` | UUID nullable | Building dùng để prefill, phục vụ trace |
| `openAt` | timestamptz | thời điểm mở |
| `closeAt` | timestamptz | lớn hơn openAt |
| `state` | enum | `PENDING`, `SYNCED`, `CANCEL_PENDING`, `CANCELLED`, `FAILED` |
| `lastErrorCode` | varchar nullable | lỗi sync gần nhất |
| `remoteSessionId` | varchar nullable | chỉ để trace, không dùng làm FK |

Roster không cần copy thành bảng riêng: payload outbox snapshot danh sách
`studentCodes` tại thời điểm tạo. Thay roster sau đó không sửa phiên đã tạo.

### OutboxEvent

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK/idempotency key |
| `eventType` | varchar | loại integration operation |
| `aggregateType` | varchar | `USER`, `UNIT`, `SECTION`, `SESSION` |
| `aggregateId` | UUID | ID LMS nội bộ |
| `payload` | jsonb | snapshot tối thiểu cần gửi |
| `status` | enum | `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED` |
| `attemptCount` | integer | default 0 |
| `availableAt` | timestamptz | thời điểm retry sớm nhất |
| `lockedAt` | timestamptz nullable | lease worker |
| `lastErrorCode` | varchar nullable | mã lỗi đã rút gọn |

Worker lấy batch bằng `FOR UPDATE SKIP LOCKED`. Event cùng aggregate phải giữ
thứ tự; dependency được giải quyết bằng cách event section tự upsert lecturer,
student và unit cần thiết trước khi sync section.

## 8. Index bắt buộc

- Unique index trên mọi business code đã nêu.
- `Enrollment(courseSectionId, status)` cho roster.
- `CourseSection(lecturerId, termId, status)` cho danh sách giảng viên.
- `TimetableSlot(courseSectionId, kind, dayOfWeek, scheduledDate)`.
- `Building(campusId, code)`.
- `OutboxEvent(status, availableAt, createdAt)` cho worker.
- `IntegrationSessionRequest(courseSectionId, openAt)` cho lịch phiên.

## 9. Dữ liệu không được lưu

- Tọa độ riêng của Campus.
- Entity hoặc tọa độ phòng học.
- API key Attendance trong PostgreSQL LMS.
- JWT hoặc refresh token rõ.
- Attendance record chi tiết trong academic tables.
- Role `organizer`/`participant` trong User.
- ID nội bộ của Attendance dùng làm khóa nghiệp vụ LMS.
