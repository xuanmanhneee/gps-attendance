# Phase 5 — Quản trị dữ liệu và thống kê

**Ưu tiên:** P1 · **Phụ thuộc:** ma trận quyền Phase 1, trạng thái chuẩn Phase 2, luồng organizer Phase 4. **Mục tiêu:** admin quản trị người dùng và có số liệu thật thay cho placeholder. **Ước lượng:** 10–17 ngày công.

## Task theo thứ tự

### P05-01 — Quản lý user/account trên API (P1, 2–3 ngày)

- **Làm:** hoàn thiện tìm kiếm, lọc, phân trang, chi tiết và tạo user+account dựa trên API hiện có; thêm sửa thông tin, đổi unit/role hợp lệ, khóa/mở tài khoản, reset mật khẩu theo quyết định P00-02. Giữ `User.id` và `Account.id` riêng; admin chỉ tạo organizer/participant qua API như `docs/conventions/roles.md`.
- **Nghiệm thu:** account không lộ hash/token; mã/username trùng có lỗi code rõ; khóa account ảnh hưởng login/refresh theo P01-06; mọi thay đổi quan trọng được audit.

### P05-02 — Thay `/users` placeholder bằng màn quản trị (P1, 2–3 ngày)

- **Làm:** bảng user có tìm kiếm/lọc role/unit/status, phân trang server, form tạo/sửa/khóa, thông báo validation; empty/loading/error/retry và xác nhận hành động nhạy cảm. Không dựa vào dữ liệu demo; UI dùng role `admin/organizer/participant` trực tiếp.
- **Nghiệm thu:** admin vận hành tài khoản cơ bản không cần seed/SQL; organizer/participant không vào được màn hoặc API; danh sách lớn không tải toàn bộ vào browser.

### P05-03 — Hoàn thiện đơn vị và tag theo quyền (P1, 1–2 ngày)

- **Làm:** sau khi API được khóa ở Phase 1, kiểm tra tree unit, create/update, tag assignment khi user bị chuyển unit/disabled; chốt có cho move subtree không. `units.service.ts` hiện ghi TODO cập nhật level descendants nếu move; nếu chưa hỗ trợ, chặn rõ thay vì tạo cây sai. Rà ownership của tag trong mọi route đọc/ghi.
- **Nghiệm thu:** không tạo cycle/cấp sai; tag của organizer khác không bị đọc/sửa; filter tạo phiên phản ánh thay đổi theo chính sách snapshot đã chốt.

### P05-04 — API thống kê có định nghĩa đo lường (P1, 2–3 ngày)

- **Làm:** định nghĩa tử/mẫu số, timezone, phiên hủy, review chưa duyệt và chỉnh sửa sau chốt; thêm endpoint aggregate cho số phiên, tỷ lệ có mặt, xu hướng theo ngày/đơn vị/organizer, với phân quyền và phân trang/khoảng ngày giới hạn. Truy vấn từ nguồn đã chốt, có thông tin thời điểm cập nhật và xử lý dữ liệu đang ở Redis nếu muốn số liệu real-time.
- **Nghiệm thu:** tổng hợp bằng API khớp phép đếm trên fixture và export; không có chỉ số ước lượng nhưng gắn nhãn như số thật; query đạt ngưỡng P00-04.

### P05-05 — Thay `/statistics` placeholder và hoàn thiện dashboard (P1, 1–2 ngày)

- **Làm:** biểu đồ/bảng với filter thời gian, đơn vị, organizer theo quyền; màn admin overview hiển thị số user/unit/tag từ API thật hoặc tiếp tục `UnavailableState` khi chưa có endpoint; hiển thị timestamp dữ liệu và trạng thái rỗng/lỗi. Đồng bộ menu/route theo quyết định P00-02.
- **Nghiệm thu:** số trên chart, card, table và export thống nhất; admin/organizer chỉ thấy phạm vi được cấp; không có hard-coded/demo metrics.

### P05-06 — Quy mô dữ liệu và chính sách lưu giữ (P1, 1–2 ngày)

- **Làm:** thêm index phù hợp truy vấn người dùng, phiên, record và thống kê; cursor/keyset pagination khi offset không đáp ứng; xác định thời gian giữ GPS/device/audit và cách ẩn/xóa theo yêu cầu vận hành. Thử với bộ dữ liệu gần quy mô pilot, đo query plan trước/sau.
- **Nghiệm thu:** p95 đọc danh sách/chi tiết/thống kê đạt P00-04; dữ liệu nhạy cảm chỉ giữ đúng thời hạn đã quyết; migration có đường rollback/forward-fix.

## Cổng hoàn thành

`/users` và `/statistics` không còn placeholder; admin có thể quản trị tài khoản/đơn vị và kiểm tra số liệu thật. Quyền dữ liệu, phân trang và chính sách lưu giữ được kiểm chứng.
