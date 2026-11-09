# LMS-01 — Hoàn thiện vertical slice LMS tối thiểu

## Trạng thái

- Trạng thái: `todo`
- Ưu tiên: P1
- Branch gợi ý: `feature/LMS-01-minimum-demo`
- Phạm vi: `server/lms`, `client/lms-web` và test liên quan

## Mục tiêu

Hoàn thiện fake LMS vừa đủ để demo khả năng tích hợp với GPS Attendance. Đây
không phải task xây LMS thật hoặc port toàn bộ academic core từ nhánh khác.

Luồng phải chạy trọn vẹn:

```text
Giảng viên đăng nhập
  → xem danh sách lớp
  → mở lớp và xem roster
  → chọn tạo phiên
  → chọn tòa nhà tại bước điểm danh
  → tạo phiên qua mock Attendance gateway
  → xem trạng thái/records
  → hủy phiên
  → xem báo cáo operation integration
```

## Hiện trạng đã có

- Deno + TypeScript + SQLite, manual dependency injection tại `main.ts`.
- Tám lớp mẫu, hai sinh viên mẫu và hai tòa nhà.
- `organizer` đăng nhập LMS web; `participant` vẫn tồn tại trong database nhưng
  bị chặn khỏi web.
- Danh sách lớp, chi tiết roster và bước chọn địa điểm khi tạo phiên.
- Mock gateway bao phủ tám operation trong OpenAPI.
- Spec hiện trạng tại `server/lms/spec/README.md`.

Giữ nguyên các bảng hiện có: `units`, `users`, `accounts`, `classes`,
`enrollments`, `buildings`, `lms_sessions`.

## Công việc bắt buộc

### 1. Chuẩn hóa response LMS

Mọi endpoint trong `server/lms/src/http/lms-router.ts` trả discriminated union:

```ts
{ success: true, data: T }
{ success: false, code: string, message: string }
```

- Error code có prefix `LMS_`.
- Client unwrap response tại một API helper duy nhất.
- Không thay đổi hợp đồng REST giữa LMS và Attendance.

### 2. Validation request tạo phiên

Trước khi ghi `lms_sessions`, kiểm tra:

- Lớp và building tồn tại.
- `title` không rỗng, tối đa 255 ký tự.
- `radius > 0`.
- `openAt` và `closeAt` là ISO date hợp lệ, `closeAt > openAt`.
- Lớp có ít nhất một participant trong roster.

Request sai trả lỗi 4xx; không ghi session và không gọi gateway.

Mock gateway phải trả lỗi not found cho `externalId` không tồn tại; không tự
tạo response `pending` với `participantCount = 0`.

### 3. Làm chắc luồng web hiện có

- Nút async có loading và disabled state.
- Lỗi sync/tạo/xem records/hủy phiên hiện trên UI, không tạo unhandled rejection.
- Bỏ ô tìm kiếm nếu chưa triển khai; không để control trang trí giả chức năng.
- Hiển thị `externalId` với nhãn “Mã phiên LMS”, không gọi là ID Attendance.
- Không thêm calendar, deadline, admin UI hoặc student web UI.

### 4. Test vertical slice

Mở rộng `server/lms/src/http/lms-router.test.ts` để kiểm tra:

1. Sai mật khẩu bị từ chối.
2. Participant bị từ chối đăng nhập web nhưng vẫn có trong roster.
3. Giảng viên đọc được danh sách lớp và roster đúng lớp.
4. Request tạo phiên sai thời gian không ghi database.
5. Request hợp lệ resolve đúng tọa độ building.
6. Sync gọi đủ bốn operation directory/course/account.
7. Tạo, đọc, records và cancel bao phủ bốn operation session.
8. Toàn bộ report dùng nguồn `mock`.
9. Đọc/records/cancel một `externalId` không tồn tại trả 404.

Không thêm browser E2E framework. Router test và production build là đủ cho
fake LMS.

### 5. Đồng bộ tài liệu

Cập nhật `server/lms/spec/README.md` và `server/lms/README.md` nếu response,
error code hoặc UI label thay đổi.

## Tham khảo nhánh khác

Có thể đọc `origin/2312718_PhamNguyenNgocPhuoc_HopNhatHeThong`, nhưng chỉ tham
khảo luồng danh sách lớp/roster, validation role và cách resolve building.

Không port `AcademicTerm`, `CourseSection`, `TimetableSlot`, import Excel,
Prisma service hoặc foreign key học vụ vào Attendance trong task này.

## Không làm

- Không đổi Deno sang NestJS/Express/Hono hoặc thêm DI container.
- Không thêm ORM/migration framework hoặc chuẩn hóa Course/Section/Term.
- Không thêm timetable, room, capacity hoặc import Excel.
- Không xây admin LMS hoặc student web UI.
- Không triển khai SSO/token exchange.
- Không bật `RealAttendanceGateway`.
- Không sửa core check-in/GPS/Redis của Attendance.

## Tiêu chí nghiệm thu

- `gv001 / demo123` đi hết luồng tối thiểu không cần Attendance server.
- `sv001` nằm trong roster nhưng không đăng nhập LMS web.
- Địa điểm chỉ được chọn tại bước tạo phiên.
- Không có control giả chức năng trên các màn thuộc luồng chính.
- Mock report thể hiện đủ tám operation theo OpenAPI.
- `deno task check`, `deno task test`, LMS web typecheck và production build đạt.
- `git diff --check` sạch.

## Gợi ý chia commit

1. `fix(lms): validate session requests and normalize responses`
2. `fix(lms-web): complete async states for demo flow`
3. `test(lms): cover minimum integration vertical slice`
