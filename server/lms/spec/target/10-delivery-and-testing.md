# Delivery và Testing

## 1. Chiến lược thay thế LMS demo

Không rewrite đè Deno + SQLite trong một commit. Xây Express LMS theo vertical
slice và giữ demo chạy được đến khi đạt parity. PostgreSQL LMS dùng database
riêng với Attendance.

Không migrate dữ liệu demo SQLite sang production. Seed lại dataset có mã ổn
định; migration thật chỉ áp dụng PostgreSQL schema từ ngày cutover.

## 2. Các phase

### Phase 1 — Foundation

- Package Node/Express TypeScript.
- Config validation, Prisma/PostgreSQL, migration và seed.
- ApiResponse, error handler, request ID, health.
- Composition root và module skeleton.

Nghiệm thu: container LMS khởi động với database trống, migrate và health ready.

### Phase 2 — Identity và Organization

- Account/User/Unit schema.
- Login/refresh/logout.
- Admin User/Unit APIs.
- Role/ownership middleware và audit tối thiểu.

Nghiệm thu: admin seed tạo được lecturer/student; restart không làm mất session
refresh; non-admin bị chặn admin API.

### Phase 3 — Academic core

- Term, Course, CourseSection, Enrollment.
- Create section kèm roster.
- Roster replace và import preview/commit.
- Academic pages trên LMS Web.

Nghiệm thu: một lớp đầy đủ được tạo và lecturer xem được; không có section rỗng.

### Phase 4 — Facilities và Timetable

- Campus/Building.
- Building map anchor + default radius.
- Weekly/date slot, conflict check và calendar.
- Facilities/timetable UI.

Nghiệm thu: timetable chọn trực tiếp Building; lịch conflict bị chặn; mỗi
Building có đúng một anchor/radius.

### Phase 5 — Automatic integration

- Outbox schema/worker.
- Role/entity mapper và HTTP gateway.
- Automatic Unit/User/Section sync.
- Session create/cancel và integration admin page.

Nghiệm thu: tắt Attendance, tạo dữ liệu, bật lại và thấy worker tự sync toàn bộ.

### Phase 6 — Mobile identity

- Mobile login/refresh dùng Identity service mới.
- Explicit Attendance proxy routes.
- Bảo đảm API key chỉ ở server.

Nghiệm thu: student seed đăng nhập mobile và check-in qua LMS; đổi X-User-Code
trên client không thể mạo danh.

### Phase 7 — Reporting và cutover

- Mock provider + UI hoàn thiện trước.
- Real provider, authorization và session detail.
- Docker Compose, docs runbook và cutover từ Deno.

Nghiệm thu: đổi provider không đổi response/UI; sau cutover xóa entrypoint Deno
chỉ khi Express đã qua toàn bộ smoke test.

## 3. Test strategy

### Unit tests

- Role mapper exhaustive cho ba LMS role.
- Unit cycle detection.
- Section/roster/capacity rules.
- Timetable overlap ở boundary cases.
- Reporting formula, đặc biệt excused và denominator bằng 0.
- Outbox retry classification/backoff.

### Repository integration tests

Chạy trên PostgreSQL thật cho:

- Unique/foreign/check constraints.
- Transaction rollback section + enrollments + outbox.
- Concurrent section code creation.
- Concurrent timetable conflict.
- Worker claim bằng `SKIP LOCKED`.
- Refresh token rotation/reuse.

SQLite/in-memory không thay thế nhóm test này vì semantics transaction và lock
khác PostgreSQL.

### HTTP contract tests

- Success/error đều đúng ApiResponse.
- 401/403/409/422 mapping.
- Strict schema từ chối GPS field ở Campus.
- Route static không bị `/:id` bắt nhầm.
- Pagination/filter/ownership.

### Integration contract tests

- Gateway request khớp `docs/integration/integration-openapi.yaml`.
- Unit/User/Section upsert idempotent.
- Session externalId/fingerprint conflict.
- API key missing/wrong.
- Mobile proxy allowlist và header stripping.

### End-to-end smoke

```text
admin login
→ tạo Unit, lecturer, students
→ tạo term/course/section kèm roster
→ tạo Building và timetable
→ lecturer login
→ tạo session từ lịch bằng Building default
→ outbox sync sang Attendance
→ student mobile login/check-in
→ lecturer xem summary
```

## 4. Seed

Seed development phải có dữ liệu đủ để kiểm UI:

- 1 root Unit, ít nhất 3 khoa và các Unit con.
- 1 admin, 3 lecturer, 30 student.
- 2 term, 6 course, 12 section; mỗi section có roster.
- 2 campus, mỗi campus ít nhất 2 Building.
- Building có anchor/radius khác nhau.
- Timetable có weekly slot và một date-specific slot.
- Account demo dùng password cấu hình cho dev, hash bằng production hasher.

Seed idempotent theo business code và tạo outbox event khi cần test sync. Seed
production chỉ tạo bootstrap admin theo secret, không tạo dataset demo.

## 5. Docker Compose

Service mục tiêu:

```text
postgres-lms
lms-api
lms-web
postgres-attendance
redis-attendance
attendance-api
```

- Hai PostgreSQL có volume/database/user riêng.
- LMS API depends on PostgreSQL health, không depends on Attendance health.
- Attendance URL dùng service DNS trong Docker, không hardcode localhost.
- Secret/API key lấy từ env file local hoặc secret production.
- Migration chạy bằng command/job rõ ràng trước app start; không auto reset DB.

## 6. Migration checklist

Trước cutover:

1. Chốt và migrate PostgreSQL schema.
2. Seed tài khoản/dataset test.
3. Cập nhật integration OpenAPI nếu payload section/session đổi.
4. Chạy contract test hai backend.
5. Cập nhật mobile base URL và xác nhận refresh flow.
6. Chạy E2E trên thiết bị thật cho location.
7. Chạy backup/restore test PostgreSQL LMS.
8. Chuyển Docker Compose sang Express service.
9. Giữ Deno image/tag có thể rollback trong một release.
10. Chỉ xóa code Deno/SQLite sau khi production/pilot ổn định.

## 7. Definition of done cho mỗi feature

- Schema migration và rollback/forward note.
- Domain/application/repository/http layer đúng boundary.
- Error codes export qua shared contract nếu client dùng.
- Unit test cho nghiệp vụ không tầm thường.
- PostgreSQL integration test cho constraint/transaction.
- API docs và frontend state đầy đủ.
- Seed/fixture cập nhật.
- Authorization test.
- Log không lộ secret/PII không cần thiết.
- Docker build và typecheck/test liên quan đạt.

## 8. Ngoài scope đã chủ động bỏ

- Assignment, learning material, quiz, gradebook.
- Notification/email/SMS.
- SSO/SAML/OIDC bên thứ ba.
- Multi-tenant.
- Room và indoor positioning.
- Redis/message broker cho LMS outbox.
- Auto-generate attendance session từ mọi timetable slot.

Session vẫn được lecturer chủ động tạo từ lịch. Chỉ thêm auto-generation nếu có
nghiệp vụ rõ về ngày nghỉ, lịch bù, hủy tiết và quyền mở phiên.

## 9. Rủi ro cần kiểm chứng sớm

- Contract Attendance hiện tại có thể cần bổ sung upsert section/tag assignment
  hoặc idempotency header; phải chốt trước Phase 5.
- GPS tại Building chỉ là vùng xấp xỉ. Radius phải thử trên thiết bị thật ở các
  tòa mục tiêu.
- Roster lớn và report nhiều session có thể cần batch endpoint phía Attendance,
  nhưng chỉ tối ưu sau khi đo dữ liệu thật.
