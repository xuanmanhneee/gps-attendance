# LMS demo

Đặc tả kiến trúc, dữ liệu, API và giới hạn hiện tại:
[`spec/README.md`](spec/README.md).

LMS nhỏ nhưng có dữ liệu SQLite thật: đơn vị, người dùng, lớp, enrollment và
phiên do LMS tạo. Deno service là chủ dữ liệu LMS; Attendance chỉ nhận dữ liệu
qua REST API. Code được chia theo `database`, `courses`, `students`,
`integration` và `http` thay vì dồn vào một script.

```text
src/
  auth/          # xác thực LMS web
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

Web LMS chạy tại `http://localhost:5174`, Deno API chạy tại `http://localhost:3100`.
Trên web: đồng bộ dữ liệu trước, rồi tạo phiên từ lớp học. Mã ngoài của phiên
được giữ bởi mapping trong module integration, không nằm trên AttendanceSession.

Tài khoản demo:

- Giảng viên: `gv001` / `demo123`

LMS web chỉ cho phép role `organizer` đăng nhập. Sinh viên vẫn có trong dữ liệu
roster để đồng bộ sang Attendance nhưng sử dụng mobile client, không dùng LMS web.

Giao diện gồm đăng nhập, bảng điều khiển, danh sách khóa học, tạo/hủy phiên điểm
danh theo tòa nhà và báo cáo từng lời gọi. Hiện LMS dùng mock gateway hoàn toàn,
nhưng request/response vẫn bám theo hợp đồng trong `docs/integration/integration-openapi.yaml`.
