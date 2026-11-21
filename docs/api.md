# API hiện tại

Tài liệu này phản ánh controller và contract đang có trong repo. Swagger chạy tại
`GET /api-docs` khi backend được khởi động.

## Quy ước chung

- Các route có tiền tố `/v0` giữ nguyên như bảng bên dưới. `tags` và `units`
  hiện chưa dùng tiền tố này.
- Route yêu cầu JWT nhận header `Authorization: Bearer <accessToken>`.
- `userId` trong JWT là `User.id`, không phải `Account.id`.
- Role hệ thống: `admin`, `organizer`, `participant`.
- Response thành công được global interceptor bọc thành:

```json
{
  "success": true,
  "data": {}
}
```

- Response lỗi nghiệp vụ có dạng:

```json
{
  "success": false,
  "code": "ATTENDANCE_SESSION_NOT_FOUND",
  "message": "Không tìm thấy session"
}
```

Các endpoint trả `void` hiện chỉ có field `success` sau khi serialize.

## Authentication

| Method | Path                     | Quyền                                             | Body                     | Data trả về                     |
| ------ | ------------------------ | ------------------------------------------------- | ------------------------ | ------------------------------- |
| `POST` | `/v0/user/auth/login`    | Public; chỉ tài khoản `participant`               | `{ username, password }` | `{ accessToken, refreshToken }` |
| `POST` | `/v0/user/auth/refresh`  | Public                                            | `{ refreshToken }`       | `{ accessToken, refreshToken }` |
| `POST` | `/v0/admin/auth/login`   | Public; chỉ `admin` hoặc `organizer`              | `{ username, password }` | `{ accessToken, refreshToken }` |
| `POST` | `/v0/admin/auth/refresh` | Public; token phải thuộc `admin` hoặc `organizer` | `{ refreshToken }`       | `{ accessToken, refreshToken }` |
| `POST` | `/v0/user/auth/logout`   | Public; refresh token là credential               | `{ refreshToken }`       | `null`                          |
| `POST` | `/v0/admin/auth/logout`  | Public; refresh token là credential               | `{ refreshToken }`       | `null`                          |

`logout` thu hồi refresh token được gửi lên (idempotent, token không tồn tại
vẫn trả thành công). Access token đã cấp vẫn dùng được đến khi hết hạn (15
phút) vì JWT không được kiểm tra lại với DB ở mỗi request.

### Giới hạn tốc độ

Login, refresh và logout trả `429` với code `TOO_MANY_REQUESTS` khi vượt:

- **Theo username**: tối đa `LOGIN_MAX_FAILURES` (mặc định 10) lần đăng nhập
  trong `LOGIN_FAILURE_WINDOW_SEC` (mặc định 300 giây). Mỗi lần thử được tính
  trước khi xác thực và bộ đếm được xoá khi đăng nhập đúng. Kẻ xấu có thể cố ý
  khoá tạm một username; đổi lại không thể dò mật khẩu.
- **Theo IP**: `AUTH_IP_LIMIT_PER_MIN` (mặc định 1000) yêu cầu/phút. Mức này đủ
  cho cả một giảng đường dùng chung NAT đăng nhập cùng lúc. Khi chạy sau proxy
  phải đặt `TRUST_PROXY`, nếu không mọi client dùng chung bộ đếm của proxy.

Bộ đếm nằm trong Redis nên dùng chung giữa các instance. Nếu Redis lỗi, giới
hạn bị bỏ qua (fail-open) để không chặn đăng nhập.

## Attendance sessions

| Method  | Path                                            | Quyền                         | Body/query                       | Data trả về                                |
| ------- | ----------------------------------------------- | ----------------------------- | -------------------------------- | ------------------------------------------ |
| `POST`  | `/v0/attendance-sessions`                       | JWT, `organizer`              | `CreateAttendanceSessionRequest` | `AttendanceSessionResponse`                |
| `PATCH` | `/v0/attendance-sessions/:id`                   | JWT, organizer tạo phiên      | `UpdateAttendanceSessionRequest` | `AttendanceSessionResponse`                |
| `PATCH` | `/v0/attendance-sessions/:id/cancel`            | JWT, organizer tạo phiên      | Không có                         | `AttendanceSessionResponse`                |
| `GET`   | `/v0/attendance-sessions`                       | JWT, `admin` hoặc `organizer` | Không có                         | `AttendanceSessionResponse[]`              |
| `GET`   | `/v0/attendance-sessions/created-by-me`         | JWT, `organizer`              | Không có                         | `AttendanceSessionResponse[]`              |
| `GET`   | `/v0/attendance-sessions/created-by?userId=:id` | JWT, `admin`                  | Query `userId`                   | `AttendanceSessionResponse[]`              |
| `GET`   | `/v0/attendance-sessions/me`                    | JWT                           | Không có                         | `MyAttendanceSessionResponse[]`            |
| `GET`   | `/v0/attendance-sessions/:id`                   | JWT, `admin` hoặc `organizer` | Không có                         | `AttendanceSessionDetailResponse`          |
| `GET`   | `/v0/attendance-sessions/:id/criteria`          | JWT, organizer tạo phiên      | Không có                         | `{ criteria: UserFilterCriteria \| null }` |

`participantCriteria` phải chứa ít nhất một điều kiện trong `unitFilter`,
`tagFilter` hoặc `codeFilter`. Include của các filter được hợp, sau đó áp dụng
exclude. Khi phiên đang mở chỉ được sửa `closeAt`; sau khi roster được khởi tạo
thì không được sửa criteria.

Roster gồm mọi user khớp criteria, không phân biệt role: criteria là nơi quyết
định ai thuộc phiên, server không lọc thêm. Lưu ý đăng nhập mobile chỉ dành cho
`participant`, nên user role khác có trong roster sẽ ở trạng thái `absent` trừ
khi được xử lý thủ công. Roster được khởi tạo lúc `openAt − 5 phút`: nếu
thời điểm đó đã qua khi tạo phiên, việc khởi tạo chạy ngay trong request
`POST`; nếu chưa, job `attendance:init-roster` chạy đúng thời điểm đó.

## Check-in

### `POST /v0/attendance/check-in`

Quyền: JWT. Cooldown theo user và session là 10 giây, được kiểm tra trước
validation.

Body:

```json
{
  "sessionId": 1,
  "location": {
    "latitude": 11.9404,
    "longitude": 108.4583,
    "accuracy": 10,
    "timestamp": 1793760000000,
    "isMockLocation": false
  },
  "device": {
    "deviceId": "installation-uuid",
    "platform": "android",
    "model": "Pixel 8"
  },
  "integrity": {
    "integrityToken": null
  }
}
```

Data trả về là discriminated union:

```json
{ "status": "VALID" }
```

```json
{
  "status": "REVIEW",
  "reasons": ["LOW_CONFIDENCE_SCORE"]
}
```

```json
{
  "status": "REJECTED",
  "reasons": ["MOCK_LOCATION"]
}
```

`VALID` ghi `present` và giữ thiết bị. `REVIEW` vẫn là `absent`, chỉ lưu reasons
trong Redis và không giữ thiết bị. `REJECTED` không ghi record mới vào buffer.

Reason có thể trả về:

- Validation: `LOW_CONFIDENCE_SCORE`, `MOCK_LOCATION`, `OUT_OF_RANGE`,
  `INVALID_LOCATION_TIMESTAMP`.
- Check-in: `TOO_MANY_ATTEMPTS`, `DUPLICATE_DEVICE`.

## Attendance review

Review chỉ tồn tại trong Redis đến hết cửa sổ chốt 10 phút sau `closeAt`.
Client không được gửi `reasons`.

### Danh sách review candidate

`GET /v0/attendance/sessions/:sessionId/reviews`

- Quyền: JWT, `organizer` tạo phiên.
- Candidate được tạo tự động từ lần check-in trả `REVIEW`.
- Client không cần gửi thêm request và không được gửi reasons.

```json
[
  {
    "sessionId": 1,
    "userId": 42,
    "student": {
      "code": "2312345",
      "role": "participant",
      "fullname": "Nguyễn Văn A"
    },
    "reasons": ["LOW_CONFIDENCE_SCORE"]
  }
]
```

### Duyệt hoặc từ chối

`PATCH /v0/attendance/sessions/:sessionId/reviews/:userId`

- Quyền: JWT, `organizer` tạo phiên.
- Chỉ xử lý từ `openAt` đến `closeAt + 10 phút`.
- `approve` chuyển record thành `present`; `reject` giữ `absent`.
- Cả hai quyết định đều đặt `updateBy` và khóa các lần check-in/resolve tiếp theo.

```json
{
  "decision": "approve",
  "reason": "Đã xác nhận sinh viên có mặt"
}
```

`decision` là `approve | reject`; `reason` là tùy chọn, tối đa 500 ký tự.
Quyết định thành công được ghi `AuditLog` với action `REVIEW_RESOLVED`. Nếu ghi
audit thất bại, quyết định Redis không bị hoàn tác và lỗi được ghi vào server log.

## Accounts

| Method | Path               | Quyền hiện tại | Body                                                   | Data trả về                                  |
| ------ | ------------------ | -------------- | ------------------------------------------------------ | -------------------------------------------- |
| `POST` | `/v0/accounts`     | JWT, `admin`   | `{ code, fullname, role, unitId, username, password }` | `{ user, account }` không chứa password hash |
| `GET`  | `/v0/accounts/:id` | JWT, `admin`   | Không có                                               | Account không chứa password hash             |

`role` khi tạo account chỉ nhận `organizer` hoặc `participant`.

## Users

| Method | Path                    | Quyền hiện tại | Body                 | Data trả về           |
| ------ | ----------------------- | -------------- | -------------------- | --------------------- |
| `GET`  | `/v0/users`             | JWT, `admin` hoặc `organizer` | Không có     | `User[]`              |
| `GET`  | `/v0/users/me`          | JWT            | Không có             | `UserProfileResponse` |
| `GET`  | `/v0/users/:id`         | JWT, `admin` hoặc `organizer` | Không có     | `User \| undefined`   |
| `POST` | `/v0/users/test-filter` | JWT, `admin` hoặc `organizer` | `UserFilterCriteria` | `number[]` user ID    |

## Tags

Tất cả endpoint tag yêu cầu JWT. Base path hiện tại là `/tags`, chưa có `/v0`.

| Method   | Path                         | Mô tả                           |
| -------- | ---------------------------- | ------------------------------- |
| `POST`   | `/tags`                      | Tạo tag thuộc user hiện tại     |
| `GET`    | `/tags`                      | Lấy tag do user hiện tại sở hữu |
| `GET`    | `/tags/:id`                  | Lấy tag do user hiện tại sở hữu (403 nếu của người khác) |
| `DELETE` | `/tags/:id`                  | Xóa tag do user hiện tại sở hữu |
| `GET`    | `/tags/:tagId/users`         | Lấy user ID được gắn tag        |
| `GET`    | `/tags/users/:userId/tags`   | Lấy tag của một user, chỉ gồm tag do user hiện tại sở hữu |
| `POST`   | `/tags/:tagId/users/:userId` | Gắn tag vào user                |
| `DELETE` | `/tags/:tagId/users/:userId` | Gỡ tag khỏi user                |

## Units

Base path là `/units`. Đọc yêu cầu JWT `admin` hoặc `organizer`; tạo/sửa chỉ
`admin`. Body được kiểm tra bằng `CreateUnitDto`/`UpdateUnitDto`.

| Method  | Path          | Quyền                         | Body                   | Data trả về          |
| ------- | ------------- | ----------------------------- | ---------------------- | -------------------- |
| `GET`   | `/units`      | JWT, `admin` hoặc `organizer` | Không có               | `Unit[]`             |
| `GET`   | `/units/tree` | JWT, `admin` hoặc `organizer` | Không có               | `UnitTreeResponse[]` |
| `GET`   | `/units/:id`  | JWT, `admin` hoặc `organizer` | Không có               | `Unit \| null`       |
| `POST`  | `/units`      | JWT, `admin`                  | `{ name, parentId? }`  | `Unit`               |
| `PATCH` | `/units/:id`  | JWT, `admin`                  | `{ name?, parentId? }` | `Unit`               |

## Health

| Method | Path      | Quyền  | Data trả về                                                                 |
| ------ | --------- | ------ | --------------------------------------------------------------------------- |
| `GET`  | `/health` | Public | `{ status: 'ok', checks: { database: 'up', redis: 'up' } }` |

Kiểm tra PostgreSQL (`SELECT 1`) và Redis (`PING`), mỗi bên tối đa 2 giây.
Khi một bên không phản hồi, trả HTTP 503 với code `SERVICE_UNAVAILABLE` và
message nêu tên phụ thuộc bị lỗi. Dùng cho healthcheck Docker và `/healthz`
của nginx trong stack perf. Route không có tiền tố `/v0`.

## Error code liên quan attendance review

| Code                                         | Ý nghĩa                                          |
| -------------------------------------------- | ------------------------------------------------ |
| `ATTENDANCE_REVIEW_USER_NOT_IN_SESSION`      | Không có record của user trong phiên             |
| `ATTENDANCE_REVIEW_ALREADY_CHECKED_IN`       | Record đã `present`                              |
| `ATTENDANCE_REVIEW_RECORD_LOCKED`            | Organizer đã chốt record                         |
| `ATTENDANCE_REVIEW_CANDIDATE_NOT_FOUND`      | Không có review candidate đang chờ                |
| `ATTENDANCE_REVIEW_RESOLUTION_WINDOW_CLOSED` | Ngoài cửa sổ chốt hoặc buffer đang flush         |

Các nhóm code còn lại được định nghĩa tại
`packages/shared/src/api/response/codes/`.

Hai code trong `CommonErrorCode` chỉ do client (`FetchHttpClient`) tự sinh với
`status = 0`, server không bao giờ trả về: `REQUEST_TIMEOUT` (quá 30 giây) và
`NETWORK_ERROR` (không kết nối được). Response lỗi không theo dạng
`ApiResponse` (ví dụ trang 502 của nginx) thành `UNKNOWN_ERROR` với HTTP status
gốc. `isRetryableApiError()` trả `true` cho hai code trên và cho status 429,
502, 503, 504.
