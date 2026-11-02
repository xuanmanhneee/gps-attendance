# Phase 4 — Luồng organizer và xử lý kết quả

**Ưu tiên:** P1 · **Phụ thuộc:** P02-03/P02-06/P02-07, các quyền Phase 1. **Mục tiêu:** organizer tự vận hành một phiên từ tạo đến chốt và xuất kết quả. **Ước lượng:** 10–16 ngày công.

## Task theo thứ tự

### P04-01 — Hoàn thiện wizard tạo phiên đang phát triển (P1, 1–2 ngày)

- **Làm:** tiếp tục từ thay đổi hiện có ở `SessionCreatePage.tsx`, `SessionLocationFields.tsx`, `session-form.ts` thay vì viết lại; kiểm tra validation tọa độ/bán kính, timezone, `closeAt > openAt`, bước quay lại, trạng thái gửi lặp, loading lỗi API và geolocation; preview giá trị cuối trước gửi. Giữ map kéo điểm và đường nhập tọa độ bằng bàn phím.
- **Nghiệm thu:** build/test dashboard xanh; tạo phiên bằng bản đồ và nhập tay đều đúng tọa độ/giờ/criteria ở API; thao tác Back/refresh có hành vi được ghi rõ.

### P04-02 — Chọn participant và xem trước roster (P1, 2 ngày)

- **Làm:** hoàn thiện `ParticipantCriteriaEditor` để chọn đơn vị/tag/mã người theo chính sách filter; API preview trả số lượng và mẫu người dự kiến thuộc quyền xem, có cảnh báo 0 người/trùng điều kiện; chốt rõ snapshot sẽ khóa lúc nào. Không tải toàn bộ directory nếu không cần, phân trang/tìm kiếm ở server khi lớn.
- **Nghiệm thu:** organizer biết ai sẽ được chọn trước khi tạo; criteria gửi khớp preview và luật filter; quyền của tag/đơn vị không bị vượt.

### P04-03 — Sửa/hủy phiên đúng điều kiện (P1, 1–2 ngày)

- **Làm:** nối các thao tác update/cancel có sẵn ở API vào UI; disable field đã khóa sau khi roster khởi tạo, chỉ cho đổi closeAt khi mở nếu hợp đồng cho phép; cảnh báo tác động khi hủy phiên đang mở; cập nhật danh sách/chi tiết sau mutation, xử lý xung đột do hai người sửa cùng lúc.
- **Nghiệm thu:** UI và server đều từ chối thao tác không hợp lệ; không hiển thị phiên đã hủy như phiên đang mở; khi API lỗi không báo thành công giả.

### P04-04 — Bảng kết quả thời gian gần thực (P1, 1–2 ngày)

- **Làm:** trang `AttendanceRecordsPage` đang đọc detail phiên; thêm refresh theo nhu cầu hoặc polling nhẹ cho phiên đang mở, đánh dấu thời điểm tải và trạng thái nguồn (roster chưa tạo/đang flush/đã chốt). Tách các trạng thái review và rejected theo P02-06, phân trang/lọc server-side nếu số người lớn.
- **Nghiệm thu:** 2 trình duyệt cùng xem không thấy dữ liệu cũ quá ngưỡng P00-04; chuyển Redis→DB không làm bảng rỗng hoặc đếm đôi; có loading/error/retry.

### P04-05 — Hàng chờ duyệt và sửa tay (P1, 2–3 ngày)

- **Làm:** tạo UI xem bằng chứng tối thiểu của `REVIEW`, quyết định approve/reject với lý do, xác nhận quyền owner và audit; thao tác `late/excused` hoặc điều chỉnh vắng theo chính sách P00-03. Hiển thị người sửa/thời điểm và trạng thái trước/sau, chặn double-submit và xung đột version.
- **Nghiệm thu:** một review chỉ có một quyết định cuối hợp lệ; participant nhìn thấy kết quả mới; mọi thay đổi truy được audit; role khác/owner khác không duyệt được.

### P04-06 — Xuất kết quả chính thức (P1, 1–2 ngày)

- **Làm:** xuất CSV/XLSX theo phạm vi phiên được phép, mã/họ tên/đơn vị/trạng thái/giờ điểm danh và metadata phiên; ghi timezone, thời điểm xuất, phiên bản dữ liệu, số record; chọn cách xử lý review chưa chốt và dữ liệu sau chỉnh sửa. Escape công thức trong bảng tính để tránh injection.
- **Nghiệm thu:** tổng số và từng trạng thái trong file khớp API tại thời điểm chốt; file lớn vẫn tải ổn; không xuất dữ liệu phiên của organizer khác.

### P04-07 — Hoàn thiện điều hướng và chất lượng UI organizer (P2, 1–2 ngày)

- **Làm:** sửa lệch quyền menu/route trong `config/navigation.ts`; đưa Login vào i18n/design token; loại nút Google không có chức năng nếu chưa có OAuth; thêm ErrorBoundary và lazy load bản đồ; chia nhỏ page wizard sau khi hành vi ổn định. Dọn `createSession` không dùng và comment/key cũ theo `client/admin-dashboard/PLAN.md`/`ARCHITECTURE.md`.
- **Nghiệm thu:** menu và route cho organizer/admin khớp quyết định quyền; lỗi render không làm trắng toàn app; bundle map không vào entry nếu lazy; không mất tính năng wizard.

## Cổng hoàn thành

Organizer tạo, sửa, hủy, theo dõi, duyệt và xuất một phiên trên UI mà không sửa DB/Redis thủ công. Các trạng thái và tổng số trong UI khớp API; tác vụ đã khóa được giải thích rõ.
