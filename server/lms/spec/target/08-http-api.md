# HTTP API

## 1. Quy ước

Base path web/admin: `/api`. Mobile compatibility giữ `/v0` cho các route mà
mobile hiện dùng. Integration outbound gọi `/v1/integration` của Attendance.

Mọi response:

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };
```

HTTP status vẫn phản ánh lỗi; client không chỉ đọc `success`.

## 2. Pagination

List endpoint nhận:

```text
page      integer, default 1, min 1
pageSize  integer, default 20, min 1, max 100
sort      allowlist theo endpoint
order     asc | desc
```

Response data:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

## 3. Auth endpoints

| Method | Path | Quyền | Chức năng |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login web |
| POST | `/api/auth/refresh` | Refresh token | Rotate token |
| POST | `/api/auth/logout` | Authenticated | Revoke session |
| GET | `/api/auth/me` | Authenticated | User/profile hiện tại |
| POST | `/api/auth/change-password` | Authenticated | Đổi password |

Mobile giữ `POST /v0/user/auth/login`, `/refresh`, `/logout` với cùng Identity
service, không duy trì một kho account khác.

## 4. Organization endpoints

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/units` | Admin/Lecturer |
| POST | `/api/units` | Admin |
| PATCH | `/api/units/:id` | Admin |
| POST | `/api/units/:id/deactivate` | Admin |
| GET | `/api/users` | Admin |
| POST | `/api/users` | Admin |
| GET | `/api/users/:id` | Admin |
| PATCH | `/api/users/:id` | Admin |
| POST | `/api/users/:id/change-role` | Admin |
| POST | `/api/users/:id/reset-password` | Admin |
| POST | `/api/users/:id/deactivate` | Admin |

Route tĩnh như `/api/users/me` hoặc `/search` phải khai báo trước `/:id`.

## 5. Academic endpoints

| Method | Path | Quyền |
|---|---|---|
| GET/POST | `/api/academic-terms` | Read: Admin/Lecturer; Write: Admin |
| GET/PATCH | `/api/academic-terms/:id` | Read: Admin/Lecturer; Write: Admin |
| GET/POST | `/api/courses` | Read: Admin/Lecturer; Write: Admin |
| GET/PATCH | `/api/courses/:id` | Read: Admin/Lecturer; Write: Admin |
| GET/POST | `/api/course-sections` | Scoped read; create Admin |
| GET/PATCH | `/api/course-sections/:id` | Scoped read; update Admin |
| GET | `/api/course-sections/:id/roster` | Admin/owner Lecturer |
| POST | `/api/course-sections/:id/roster/students` | Admin |
| DELETE | `/api/course-sections/:id/roster/students/:studentId` | Admin |
| PUT | `/api/course-sections/:id/roster` | Admin, replace roster |
| POST | `/api/roster-import/preview` | Admin |
| POST | `/api/course-sections/:id/roster-import/commit` | Admin |

POST section luôn nhận `studentCodes`; không có endpoint tạo section rỗng.

## 6. Facilities và timetable

| Method | Path | Quyền |
|---|---|---|
| GET/POST | `/api/campuses` | Read scoped; write Admin |
| PATCH | `/api/campuses/:id` | Admin |
| GET/POST | `/api/campuses/:campusId/buildings` | Read scoped; write Admin |
| PATCH | `/api/buildings/:id` | Admin |
| POST | `/api/facilities/:type/:id/deactivate` | Admin |
| GET | `/api/timetable` | Authenticated, ownership scoped |
| GET/POST | `/api/course-sections/:id/timetable-slots` | Read scoped; write Admin |
| PATCH/DELETE | `/api/timetable-slots/:id` | Admin |

Building payload nhận `latitude`, `longitude`, `defaultRadiusMeters`. Campus
không nhận GPS field; unknown field bị reject ở schema strict.

## 7. Attendance integration endpoints trên LMS

| Method | Path | Quyền |
|---|---|---|
| POST | `/api/course-sections/:id/attendance-sessions` | Admin/owner Lecturer |
| GET | `/api/course-sections/:id/attendance-sessions` | Admin/owner Lecturer |
| GET | `/api/attendance-sessions/:id` | Admin/owner Lecturer |
| POST | `/api/attendance-sessions/:id/cancel` | Admin/owner Lecturer |
| GET | `/api/integration/events` | Admin |
| POST | `/api/integration/events/:id/retry` | Admin |
| GET | `/api/integration/status` | Admin |

Giữ endpoint full sync chỉ cho dev/ops và không dùng trong flow production:

```text
POST /api/integration/reconcile
```

Reconcile tạo event còn thiếu; không gọi hàng loạt trực tiếp trong request.

## 8. Reporting endpoints

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/course-sections/:id/attendance-summary` | Admin/owner Lecturer |
| GET | `/api/course-sections/:id/students/:code/attendance-summary` | Admin/owner Lecturer |
| GET | `/api/me/attendance-summary` | Student |

## 9. Validation

- Schema strict; từ chối field thừa ở mutation quan trọng.
- ID path phải là UUID hợp lệ.
- Code trim/uppercase tại boundary rồi domain kiểm invariant.
- Date nhận `YYYY-MM-DD`; timestamp nhận ISO 8601 có timezone.
- Latitude `[-90, 90]`, longitude `[-180, 180]`; radius theo contract Attendance.
- Không tin role/userCode gửi trong body; lấy actor từ JWT.

## 10. Error codes

Mỗi feature định nghĩa const object riêng và export qua shared API tương ứng.
Các code cốt lõi:

```text
LMS_AUTH_INVALID_CREDENTIALS
LMS_AUTH_TOKEN_EXPIRED
LMS_AUTH_FORBIDDEN
LMS_UNIT_NOT_FOUND
LMS_UNIT_CYCLE
LMS_USER_CODE_CONFLICT
LMS_USER_ROLE_CONFLICT
LMS_TERM_CLOSED
LMS_COURSE_NOT_FOUND
LMS_SECTION_NOT_FOUND
LMS_SECTION_ROSTER_REQUIRED
LMS_SECTION_CAPACITY_EXCEEDED
LMS_ROSTER_INVALID_STUDENTS
LMS_FACILITY_NOT_FOUND
LMS_FACILITY_IN_USE
LMS_TIMETABLE_CONFLICT
LMS_SESSION_INVALID_LOCATION
LMS_INTEGRATION_UNAVAILABLE
LMS_INTEGRATION_EVENT_NOT_RETRYABLE
LMS_REPORTING_UNAVAILABLE
```

Message dành cho người dùng, code dành cho client switch-case. Không parse
message để quyết định UI.

## 11. Idempotency và concurrency

- Unique constraint là lớp bảo vệ cuối cho business code.
- POST tạo session dùng externalId do server sinh và outbox idempotency.
- Retry endpoint không tạo event mới nếu event đang pending/processing.
- Roster replace dùng expected version hoặc updatedAt để phát hiện lost update.
- Conflict trả HTTP 409; validation 422; forbidden 403; unauthenticated 401.
