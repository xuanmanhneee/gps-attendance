# Kế hoạch tích hợp GPS Attendance với hệ thống quản lý đào tạo

## 1. Quyết định phạm vi

- Mỗi deployment GPS Attendance phục vụ một cơ sở giáo dục và tích hợp tối đa
  một hệ thống quản lý đào tạo (gọi tắt là LMS).
- Attendance vẫn chạy độc lập; `/v1/integration` là inbound port trung tính,
  không chứa phép ánh xạ của hệ thống nguồn.
- `User.code` là mã nghiệp vụ duy nhất trong deployment. LMS gửi mã người dùng,
  Attendance tự ánh xạ sang `User.id` nội bộ.
- LMS tự quản lý môn học, lớp học phần, lịch học và tính roster. Attendance
  không lưu các model đó và không truy vấn Unit/Tag để dựng roster LMS.
- Unit có thể được đồng bộ làm metadata tổ chức. LMS adapter ánh xạ lớp học phần
  thành Tag và roster trước khi gọi Attendance.
- Fake LMS chỉ để demo REST, dùng fixture trong memory và không có database.

## 2. Ranh giới hệ thống

Hai ứng dụng nằm cùng monorepo nhưng chỉ giao tiếp qua HTTP:

```text
server/lms hoặc connector      server/attendance
adapter + REST client   -----> /v1/integration (port trung tính)
```

Không bên nào import service, repository, Prisma client hoặc đọc database/Redis
của bên kia. `integration-openapi.yaml` là nguồn sự thật của giao thức.

## 3. Luồng demo

1. LMS gọi `PUT /units` để upsert cây tổ chức theo `externalCode`.
2. LMS gọi `PUT /users` để upsert hồ sơ theo `code`; không tạo Account.
3. LMS ánh xạ lớp thành Tag rồi gọi `PUT /tags` với `organizerCode` và
   `participantCodes`.
4. LMS gọi `POST /sessions`, gửi `organizerCode` và `participantCodes` đã tính.
5. Attendance kiểm tra toàn bộ code và role trước khi tạo session.
6. Port chuyển roster thành `participantCriteria.codeFilter`, rồi gọi lại
   `AttendanceSessionsService` hiện có.
7. Sinh viên đăng nhập mobile bằng tài khoản LMS; LMS xác thực identity rồi gọi
   ba API mobile của Attendance bằng API key và `User.code`.
8. Mobile check-in và organizer review bằng nghiệp vụ hiện tại.
9. LMS đọc trạng thái và kết quả qua API GET.

## 4. Hợp đồng API

Base URL: `/v1/integration`. Mọi request dùng `X-Api-Key` qua HTTPS.

| API                                  | Mục đích                                   |
| ------------------------------------ | ------------------------------------------ |
| `PUT /units`                         | Upsert cây Unit theo `externalCode`        |
| `PUT /users`                         | Upsert User theo `code`, không tạo Account |
| `PUT /tags`                          | Upsert Tag và roster của organizer         |
| `POST /sessions`                     | Tạo session idempotent theo `externalId`   |
| `GET /sessions/{externalId}`         | Đọc trạng thái session                     |
| `GET /sessions/{externalId}/records` | Đọc kết quả theo mã người dùng             |
| `POST /sessions/{externalId}/cancel` | Hủy session                                |
| `GET /mobile/users/me`               | Đọc hồ sơ participant đã xác thực ở LMS    |
| `GET /mobile/attendance-sessions/me` | Đọc phiên của participant                  |
| `POST /mobile/attendance/check-in`   | Điểm danh thay participant                 |

Ba API mobile nhận thêm `X-User-Code`. LMS chỉ gắn header này sau khi xác thực
access token của chính LMS; mobile không biết API key và Attendance không nhận
token hoặc mật khẩu LMS.

Quy tắc tạo session:

- `externalId` chưa tồn tại: tạo mới.
- Cùng `externalId` và cùng nội dung chuẩn hóa: trả session hiện có.
- Cùng `externalId` nhưng nội dung khác: trả 409.
- `participantCodes` được trim, sort trước khi tính fingerprint; thứ tự không
  làm thay đổi tính idempotent.
- `externalId`, fingerprint và liên kết đến `AttendanceSession.id` nằm trong
  `IntegrationSessionLink`, thuộc module integration; attendance core không biết
  mã của LMS.
- Owner phải có role `organizer`; mọi thành viên phải có role `participant`.
- Có code không tồn tại hoặc sai role thì request thất bại, không tạo session.

## 5. Tổ chức code

```text
server/attendance/src/integration/
  dto/
  infra/prisma/
  integration-api-key.guard.ts
  integration.controller.ts
  integration-session-link.model.ts
  integration-session-link.repository.ts
  integration.service.ts
  integration.module.ts

server/lms/
  deno.json
  src/sqlite-lms.repository.ts
  src/attendance-client.ts
  src/integration/mobile-attendance.integration.ts
  src/main.ts

client/lms-web/
  src/App.tsx
```

Integration service chỉ xác thực external key, validate contract trung tính và
điều phối service hiện có. Mọi ánh xạ domain nguồn nằm trong LMS adapter. LMS
demo dùng SQLite qua Deno, có repository interface để đổi persistence khi cần.
Nghiệp vụ session, roster, check-in, review và record vẫn thuộc attendance core.

## 6. Ngoài scope demo

- SSO với nhà cung cấp identity bên thứ ba; demo hiện dùng account/session LMS.
- Đồng bộ môn học, lớp học phần hoặc thời khóa biểu ngoài Tag snapshot.
- Webhook/retry queue; fake LMS dùng polling GET records.
- Multi-tenant, nhiều LMS trong một deployment hoặc namespace mã người dùng.
- Rate limiting riêng cho integration API.

Các mục trên chỉ bổ sung khi demo/pilot thực sự cần; không làm trước để giữ lát
cắt integration nhỏ và kiểm chứng được.

## 7. Nghiệm thu

- Gọi lại Unit/User cùng dữ liệu không tạo bản ghi trùng.
- Unit con có thể đứng trước cha trong payload.
- Tạo session với code thiếu/sai role không tạo dữ liệu.
- Gọi đồng thời/calling lại cùng `externalId` chỉ có một session.
- Cùng `externalId` nhưng nội dung khác trả 409.
- API key sai trả 401; chưa cấu hình integration trả 503.
- Fake LMS sync fixture, tạo session và đọc lại records hoàn toàn qua REST.
