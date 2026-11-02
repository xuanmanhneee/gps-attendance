# Phase 3 — Mobile và phiên đăng nhập participant

**Ưu tiên:** P1 (các lỗi token là P0 trước pilot) · **Phụ thuộc:** P01-06, P02-06. **Mục tiêu:** participant hoàn tất đăng nhập → xem phiên → điểm danh → nhận trạng thái cuối trên thiết bị thật. **Ước lượng:** 8–13 ngày công.

## Task theo thứ tự

### P03-01 — Lưu và xoay cặp token đúng hợp đồng (P0, 2 ngày)

- **Làm:** mobile `authApi.login` hiện nhận `LoginResponse` nhưng `AuthProvider` chỉ lưu `accessToken`; `refreshToken()` hiện gọi POST không có body dù server yêu cầu `RefreshTokenDto`. Lưu cặp token trong SecureStore, gửi refresh token body, rotation một lần, single-flight khi nhiều request 401, retry tối đa một lần và xóa cả hai token khi refresh thất bại. Không gửi refresh token qua header Authorization của request thường.
- **Nghiệm thu:** access hết hạn trong lúc app foreground/background hoặc mở lại vẫn khôi phục phiên; nhiều request 401 chỉ refresh một lần; replay/refresh lỗi đưa về login rõ ràng, không lặp vô hạn.

### P03-02 — Đăng xuất và thay đổi tài khoản (P0, 1 ngày)

- **Làm:** nối mobile và dashboard tới endpoint thu hồi refresh session P01-06; luôn xóa token cục bộ kể cả mạng lỗi, hiển thị thông báo phù hợp; xóa cache dữ liệu người dùng cũ khi đăng nhập tài khoản khác. Xóa/chỉnh API logout mobile đang trỏ tới endpoint chưa tồn tại.
- **Nghiệm thu:** sau logout không refresh được bằng token cũ; dữ liệu phiên/tài khoản trước không hiện chớp nhoáng cho tài khoản tiếp theo; test cả offline logout.

### P03-03 — Đồng bộ trạng thái check-in (P1, 1–2 ngày)

- **Làm:** áp hợp đồng `VALID/REVIEW/REJECTED` từ P02-06 vào Home, profile/lịch sử và shared type. Sau mỗi kết quả, gọi lại nguồn trạng thái từ server; không tự set `present` khi kết quả đang chờ duyệt. Xử lý `ALREADY_CHECKED_IN`, phiên vừa đóng, retry do timeout và lỗi mạng không chắc request đã được ghi.
- **Nghiệm thu:** UI không báo thành công giả; mở lại app sau `REVIEW`, duyệt hoặc từ chối cho kết quả giống server; bấm lặp không tạo hai bản ghi.

### P03-04 — UX quyền vị trí và chất lượng GPS (P1, 1–2 ngày)

- **Làm:** trạng thái xin quyền/lỗi quyền, GPS tắt, vị trí quá cũ, độ chính xác kém, timeout và không có mạng có hướng dẫn ngắn; chỉ gửi mẫu vị trí mới cho lần bấm; khóa nút khi đang gửi; hiển thị thời gian phiên theo timezone người dùng và thời gian server khi cần. Không mô tả mock detection là chắc chắn trên iOS.
- **Nghiệm thu:** thử trên thiết bị thật trong/ngoài bán kính, indoor GPS kém, từ chối quyền, app quay lại foreground và mất mạng; không gửi payload trống/sai timestamp.

### P03-05 — Lịch sử điểm danh cá nhân (P1, 1–2 ngày)

- **Làm:** thêm tab lịch sử dùng API chỉ trả phiên/bản ghi của chính participant, phân trang theo ngày, lọc trạng thái đã chốt, hiển thị phiên hủy, review, late/excused và lý do được phép xem. Tái sử dụng shared response, có empty/error/retry.
- **Nghiệm thu:** người dùng chỉ thấy lịch sử của mình; dữ liệu cũ trong PostgreSQL và phiên đang ở Redis đều hiện đúng, không trùng; tải nhiều trang không lặp/mất mục.

### P03-06 — Cô lập công cụ dev khỏi bản phát hành (P0, 0.5–1 ngày)

- **Làm:** `src/app/dev.tsx` có thể ép mock location và đổi deviceId; khóa bằng build profile dev hoặc loại khỏi binary pilot/production, không dựa vào công tắc UI. Định nghĩa cơ chế test chống gian lận riêng ở staging; rà `EXPO_PUBLIC_API_URL` để bản phát hành không trỏ địa chỉ LAN mẫu.
- **Nghiệm thu:** production build không có lối vào/khả năng ép payload debug; staging build vẫn thử được các nhánh kiểm thử theo quyền.

### P03-07 — Kiểm thử thiết bị và accessibility (P1, 1–2 ngày)

- **Làm:** chạy Android/iOS theo phạm vi P00-04, kiểm tra thiết bị yếu, kích cỡ chữ, screen reader, mạng chập chờn, app background/resume, quyền vị trí và xử lý thông báo. Ghi phiên bản OS/model, video/ảnh lỗi và checklist hồi quy.
- **Nghiệm thu:** luồng đầy đủ đạt trên ma trận thiết bị pilot; lỗi quan trọng được sửa hoặc có quyết định chặn phát hành.

## Cổng hoàn thành

Participant dùng được luồng end-to-end trên thiết bị thật; token không buộc đăng nhập lại mỗi 15 phút và có thể thu hồi; trạng thái chờ duyệt không bị hiển thị thành đã có mặt; bản phát hành không chứa thao tác debug nguy hiểm.
