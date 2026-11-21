# LMS demo

Đặc tả kiến trúc, dữ liệu, API và giới hạn hiện tại:
[`spec/README.md`](spec/README.md).

LMS nhỏ nhưng có dữ liệu SQLite thật: đơn vị, người dùng, lớp, enrollment và
phiên do LMS tạo. Deno service là chủ dữ liệu LMS; Attendance chỉ nhận dữ liệu
qua REST API. Code được chia theo `database`, `courses`, `students`,
`integration` và `http` thay vì dồn vào một script.

```text
src/
  auth/          # xác thực web và mobile bằng tài khoản LMS
  attendance-summary/ # API thống kê lớp; hiện trả mock data ổn định cho UI
  courses/       # lớp, roster, tòa nhà và phiên LMS
  database/      # repository contract và SQLite implementation
  http/          # router cùng contract test
  integration/   # Attendance gateway, client và orchestration
  students/      # unit và user directory
  main.ts        # composition root
```

## Chạy

```bash
pnpm dev:lms
pnpm dev:lms-web
```

Yêu cầu Deno >= 2.2 vì SQLite dùng `node:sqlite`. Copy `.env.example` thành
biến môi trường tương ứng; Attendance server cần cùng `INTEGRATION_API_KEY`.
Mobile xác thực hoàn toàn tại LMS. Module `integration` chỉ chuyển tiếp ba thao
tác nghiệp vụ sang `ATTENDANCE_INTEGRATION_URL` bằng `INTEGRATION_API_KEY` và
mã sinh viên đã xác thực; token LMS không được gửi sang Attendance.

Web LMS chạy tại `http://localhost:5174`, Deno API chạy tại `http://localhost:3100`.
Trên web có thể tạo phiên trực tiếp từ lớp học; LMS tự đồng bộ Unit, User và
roster trước khi gọi Attendance. Mã ngoài của phiên
được giữ bởi mapping trong module integration, không nằm trên AttendanceSession.

Tài khoản demo:

- Admin: `admin` / `demo123`
- Giảng viên: `gv001` / `demo123`
- Sinh viên: `sv001` / `demo123`

Seed hiện có 8 Unit, 3 giảng viên (`gv001`–`gv003`), 20 sinh viên
(`sv001`–`sv020`) và 12 lớp, mỗi lớp đều có roster. Mọi account seed dùng mật
khẩu `demo123`.

LMS dùng role nghiệp vụ thật `admin`, `lecturer`, `student`. Web cho phép
`admin`/`lecturer`; mobile chỉ cho phép `student`. Module integration ánh xạ
`lecturer → organizer`, `student → participant` trước khi gọi Attendance.

Giao diện gồm đăng nhập, bảng điều khiển, danh sách khóa học, tạo/hủy phiên điểm
danh theo tòa nhà và báo cáo từng lời gọi. LMS gọi Attendance API thật theo
`ATTENDANCE_INTEGRATION_URL`; lỗi kết nối hoặc API key được trả về giao diện,
không tự chuyển sang dữ liệu mock.

## API mock thống kê

`GET /api/classes/:classId/attendance-summary` yêu cầu web session lecturer và
trả `ApiResponse<ClassAttendanceSummary>`. Dữ liệu hiện có `source: "mock"`, 12
phiên đã chốt cùng số lần có mặt, trễ, vắng, có phép và tỉ lệ của từng sinh viên.
Mock được sinh ổn định từ roster để UI có thể phát triển trước khi nối records
thật từ Attendance.

## API quản trị directory

Đăng nhập `POST /api/auth/login` bằng tài khoản admin, rồi gửi token LMS trong
`Authorization: Bearer <token>`.

```http
POST /api/admin/units
Content-Type: application/json

{"code":"KTPM","name":"Khoa Phần mềm","parentCode":"DLU"}
```

```http
POST /api/admin/users
Content-Type: application/json

{"code":"SV100","fullname":"Sinh viên mới","role":"student","unitCode":"KTPM","username":"sv100","password":"demo1234"}
```

Tạo lớp bắt buộc gửi toàn bộ roster:

```http
POST /api/admin/classes
Content-Type: application/json

{"code":"NEW101","name":"Lớp học mới","lecturerCode":"GV001","studentCodes":["SV001","SV002","SV100"]}
```

Role được tạo chỉ có `lecturer` hoặc `student`; admin chỉ được cấp bằng
seed/ops. Mỗi request sẽ sync các dependency cần thiết sang Attendance; lớp được
ánh xạ thành Tag và roster thành Tag assignments. Gọi lại cùng payload không tạo
trùng và sẽ thử sync lại nếu lần trước lỗi.
