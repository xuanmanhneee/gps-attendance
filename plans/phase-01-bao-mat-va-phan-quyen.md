# Phase 1 — Bảo mật và phân quyền API

**Ưu tiên:** P0 · **Phụ thuộc:** ma trận P00-02/P00-06. **Mục tiêu:** người không có quyền không đọc/sửa được dữ liệu; API có validation và cấu hình an toàn cho pilot. **Ước lượng:** 8–14 ngày công.

## Task theo thứ tự

### P01-01 — Khóa các route chưa có guard (P0, 2–3 ngày)

- **Làm:** áp dụng ma trận quyền đã chốt cho `UserController` (`GET /v0/users`, `GET /:id`, `POST /test-filter`), `UnitController`, `AccountController.findById`; xác định `/test-filter` là tính năng admin/organizer hay xóa khỏi API công khai. Kiểm tra tag read/assignment theo owner, và tránh để participant truy cập tài nguyên quản trị. Không dựa vào menu client để bảo vệ.
- **Nghiệm thu:** request không token, token sai role, token đúng role và token của owner khác có kết quả như ma trận; response không lộ `passwordHash`, danh sách user không lộ dữ liệu ngoài phạm vi.

### P01-02 — Siết phạm vi session và check-in (P0, 1–2 ngày)

- **Làm:** rà `GET /v0/attendance-sessions` và `/me` đang chỉ có JWT, `POST /v0/attendance/check-in` đang chỉ có JWT; đặt role guard và owner/participant membership đúng chính sách. Kiểm tra cả query/detail/criteria, không chỉ controller. Tránh trả danh sách tất cả phiên cho participant hoặc phiên người khác cho organizer nếu ma trận cấm.
- **Nghiệm thu:** test quyền đọc/lọc và check-in cho ba role; các trường hợp vượt quyền trả 403/404 theo hợp đồng, không làm rò sự tồn tại của dữ liệu nhạy cảm.

### P01-03 — Chuẩn hóa DTO và lỗi API (P0, 1–2 ngày)

- **Làm:** thay input là interface thuần ở unit/user/filter bằng DTO có class-validator phù hợp; bật/đánh giá `forbidNonWhitelisted`, giới hạn kích thước chuỗi và giá trị số, kiểm tra `deviceId`, `radius`, thời gian, mảng filter. Đưa lỗi nghiệp vụ đang dùng chuỗi tự phát (`USER_NOT_IN_SESSION`, `ALREADY_CHECKED_IN`, v.v.) vào error codes namespaced trong shared; sửa tài liệu convention nếu đường dẫn ví dụ sai sau khi đã chốt P00-06.
- **Nghiệm thu:** input sai nhận 400 `ApiResponse` lỗi ổn định; client map được code; test biên cho tọa độ, timestamp, body thừa, filter lớn và ID sai.

### P01-04 — Cấu hình CORS, Swagger, secret theo môi trường (P0, 1 ngày)

- **Làm:** thay `app.enableCors()` mặc định bằng allowlist origin staging/production; quyết định giới hạn hoặc bảo vệ `/api-docs`; kiểm tra `JWT_SECRET`, `DATABASE_URL`, Redis URL và môi trường ở startup; tách `.env.example` khỏi giá trị thật và sửa ví dụ port PostgreSQL 5430/5432 cho đúng local setup.
- **Nghiệm thu:** startup báo lỗi rõ khi thiếu secret; origin không hợp lệ không được CORS; docs theo chính sách; không có secret thật trong repo/log.

### P01-05 — Chống lạm dụng endpoint nhạy cảm (P0, 1–2 ngày)

- **Làm:** đặt rate limit cho login, refresh, check-in và filter tìm người dùng; chính sách theo IP/account/session phù hợp proxy thực tế; kiểm tra lockout không làm người hợp lệ bị khóa hàng loạt. Log sự kiện thất bại với correlation ID, tránh ghi password/token/GPS chi tiết.
- **Nghiệm thu:** test gửi dồn đạt 429 với code chuẩn; request hợp lệ bình thường không bị chặn; cấu hình sau reverse proxy được kiểm thử.

### P01-06 — Thu hồi phiên và trạng thái tài khoản (P0, 1–2 ngày)

- **Làm:** thiết kế/logout endpoint thu hồi refresh session; quyết định chính sách thu hồi access token ngắn hạn khi account bị khóa/disable, đổi mật khẩu hoặc đổi role; bảo đảm refresh kiểm role đúng endpoint và token rotation dùng một lần. Thêm tác vụ dọn refresh session hết hạn.
- **Nghiệm thu:** logout/lock/disable khiến refresh thất bại; replay refresh token thất bại; hành vi access token còn hạn được ghi rõ và test.

### P01-07 — Kiểm thử bảo mật và regression (P0, 1–2 ngày)

- **Làm:** tạo test e2e cho ma trận role/owner, DTO và token (invalid/expired/replay); test `ApiResponse<T>`/error code; chạy lại test và build backend/shared/dashboard. Không dùng test e2e `Hello World` hiện tại làm bằng chứng thay thế.
- **Nghiệm thu:** checklist endpoint được chạy tự động trong CI ở P07-01; không còn route dữ liệu không chủ đích public.

## Cổng hoàn thành

Tất cả API đọc/sửa dữ liệu người dùng và phiên có chính sách quyền rõ ràng, test âm/dương xanh; secret/CORS/docs có cấu hình theo môi trường. Trước khi pilot, không chấp nhận điểm P0 chưa xử lý.
