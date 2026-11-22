# Attendance Integration

## 1. Ranh giới

`attendance-integration` là module duy nhất trong LMS được phép:

- Biết base URL và API key của Attendance.
- Biết role `admin`, `organizer`, `participant` của Attendance.
- Biết endpoint `/v1/integration`.
- Map academic data thành Unit/User/Tag/session payload.
- Proxy API điểm danh cho mobile sau khi xác thực token LMS.

Các module khác chỉ phát sinh business event hoặc gọi application port, không
import HTTP client/DTO của Attendance.

## 2. Mapping

### Role

```text
LMS admin     → Attendance admin
LMS lecturer  → Attendance organizer
LMS student   → Attendance participant
```

LMS luôn lưu role bên trái. Mapper tại integration boundary tạo role bên phải;
không dùng alias hoặc union role trong domain LMS.

### Entity

| LMS               | Attendance                                 | Khóa tích hợp                    |
| ----------------- | ------------------------------------------ | -------------------------------- |
| Unit              | Unit                                       | `Unit.code → externalCode`       |
| User              | User                                       | `User.code → code`               |
| CourseSection     | Tag                                        | `term.code + ":" + section.code` |
| Active enrollment | Tag assignment                             | student code                     |
| Section lecturer  | Tag owner/assignment                       | lecturer code                    |
| Session request   | AttendanceSession + IntegrationSessionLink | `externalId`                     |

Course là danh mục LMS, không sync riêng. Tag đại diện cho lớp học phần cụ thể
vì roster và giảng viên thay đổi theo học kỳ.

Tag name có dạng:

```text
[2026-HK1] CT101-01 — Lập trình căn bản
```

## 3. Transactional outbox

Mọi mutation cần sync ghi outbox trong cùng transaction với aggregate. Request
không gọi Attendance trực tiếp.

Event types tối thiểu:

```text
UNIT_UPSERTED
USER_UPSERTED
SECTION_UPSERTED
SESSION_CREATE_REQUESTED
SESSION_CANCEL_REQUESTED
```

Payload là snapshot versioned:

```json
{
  "schemaVersion": 1,
  "externalCode": "2026-HK1:CT101-01",
  "name": "[2026-HK1] CT101-01 — Lập trình căn bản",
  "lecturerCode": "GV001",
  "studentCodes": ["SV001", "SV002"]
}
```

Không để worker query lại một roster đã thay đổi nếu event cần phản ánh trạng
thái tại lúc commit. Payload roster được sort và deduplicate trước khi lưu.

## 4. Worker

### Claim

- Poll batch nhỏ bằng `FOR UPDATE SKIP LOCKED`.
- Chuyển event sang PROCESSING và đặt lease `lockedAt`.
- Worker khác có thể reclaim event nếu lease quá hạn.
- Mỗi event có `id` dùng làm idempotency key khi contract hỗ trợ.

### Retry

Transient error gồm timeout, connection error, HTTP 429 và 5xx. Retry exponential
backoff có jitter với giới hạn cấu hình.

Permanent error gồm validation 4xx, missing dependency hoặc conflict payload.
Event chuyển FAILED và chờ admin sửa dữ liệu/retry thủ công; không retry vô hạn.

### Dependency ordering

Worker xử lý event theo aggregate order. Trước SECTION_UPSERTED, adapter upsert
Unit và User được section tham chiếu để payload không thất bại vì dependency
chưa có. Operation upsert idempotent nên việc gửi lại an toàn.

Trước SESSION_CREATE_REQUESTED, adapter bảo đảm section sync thành công, sau đó
gửi session với roster snapshot. Nếu dependency chưa sync, session event được
reschedule, không đánh FAILED ngay.

## 5. Tạo phiên điểm danh

### Input từ lecturer

- Course section thuộc lecturer hoặc admin thao tác.
- Title.
- `openAt`, `closeAt`.
- Latitude, longitude lấy từ Building default, thiết bị hoặc map picker.
- Radius trong giới hạn Attendance contract.
- Timetable occurrence tùy chọn để prefill giờ và Building.

Nếu chọn nguồn BUILDING, application đọc trực tiếp Building đã gắn với timetable
rồi snapshot anchor/radius; nếu Building không active thì từ chối request.

### Transaction LMS

1. Kiểm tra ownership, section active và time range.
2. Snapshot active student codes.
3. Tạo `IntegrationSessionRequest` với externalId mới.
4. Ghi `SESSION_CREATE_REQUESTED` chứa session + lecturer + roster.
5. Commit và trả `syncStatus: PENDING`.

Worker gọi `POST /v1/integration/sessions`. Cùng externalId và fingerprint phải
idempotent; payload khác với cùng externalId là conflict.

### Hủy phiên

Hủy đổi local state thành CANCEL_PENDING và ghi event. Chỉ chuyển CANCELLED khi
Attendance xác nhận. Request hủy lặp lại là idempotent.

## 6. Sync status

Các resource cần sync trả summary:

```json
{
  "state": "PENDING | SYNCED | FAILED",
  "lastAttemptAt": "2026-11-10T14:00:00Z",
  "lastErrorCode": "INTEGRATION_USER_NOT_FOUND",
  "retryable": false
}
```

Admin có trang lọc failed event, xem lỗi đã rút gọn và retry sau khi sửa dữ
liệu. Lecturer chỉ thấy trạng thái session của lớp mình, không thấy payload hay
config integration.

## 7. API key và secret

- LMS đọc `ATTENDANCE_INTEGRATION_URL` và `ATTENDANCE_INTEGRATION_API_KEY` từ
  environment/secret manager.
- Không lưu API key trong PostgreSQL LMS, source, seed, log hoặc frontend.
- Docker Compose local dùng `.env` không commit; production dùng Docker/K8s
  secret.
- Attendance chỉ lưu hash hoặc secret record trong integration store riêng theo
  thiết kế của Attendance; LMS không truy cập store đó.
- Có thể rotate key bằng cách chấp nhận key cũ/mới trong khoảng chuyển tiếp phía
  Attendance rồi đổi secret LMS.

## 8. Mobile identity proxy

Mobile gọi LMS:

```text
POST /v0/user/auth/login
POST /v0/user/auth/refresh
GET  /v0/users/me
GET  /v0/attendance-sessions/me
POST /v0/attendance/check-in
```

Luồng proxy:

1. LMS xác thực access token và lấy `User.code`.
2. LMS chỉ cho student active dùng attendance mobile routes.
3. LMS gọi Attendance bằng API key và `X-User-Code` do server tự gắn.
4. LMS chuyển body/status/`ApiResponse` theo allowlist route.
5. Không forward JWT LMS, API key từ client, header tùy ý hoặc URL tùy ý.

Proxy là explicit route adapter, không phải generic reverse proxy để tránh SSRF
và lộ endpoint nội bộ.

## 9. Gateway abstraction

```typescript
interface AttendanceGateway {
  upsertUnits(input: AttendanceUnitInput[]): Promise<void>;
  upsertUsers(input: AttendanceUserInput[]): Promise<void>;
  upsertTags(input: AttendanceTagInput[]): Promise<void>;
  createSession(input: AttendanceSessionInput): Promise<AttendanceSessionRef>;
  cancelSession(externalId: string): Promise<void>;
  getSession(externalId: string): Promise<AttendanceSessionView>;
  getRecords(externalId: string): Promise<AttendanceRecordView[]>;
}
```

`HttpAttendanceGateway` là production implementation. Test dùng fake ghi nhận
call. Không fallback từ gateway thật sang mock khi lỗi.

## 10. Acceptance criteria

- Mutation LMS thành công khi Attendance offline và tạo pending event.
- Worker retry rồi sync thành công mà người dùng không gửi lại request.
- Gửi lại event không tạo Unit/User/Tag/session trùng.
- Section luôn sync đúng role và roster active.
- API key không xuất hiện trong database/log/browser bundle.
- Mobile không thể tự chọn `X-User-Code` khác token LMS.
- Building chỉ cung cấp default và session phải giữ snapshot không phụ thuộc
  thay đổi facility sau đó.
- Failed event có thể xem và retry có kiểm soát.
