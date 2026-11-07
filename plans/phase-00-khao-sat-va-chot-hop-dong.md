# Phase 0 — Khảo sát và chốt hợp đồng

**Ưu tiên:** P0 · **Mục tiêu:** tạo baseline đáng tin và khóa các quyết định ảnh hưởng đến schema, API, quyền và triển khai. **Ước lượng:** 5–9 ngày công. **Đầu ra:** tài liệu quyết định, ma trận API/quyền/trạng thái, backlog có người phụ trách và bằng chứng baseline.

## Task theo thứ tự

### P00-01 — Chạy baseline từ checkout sạch (P0, 1 ngày)

- **Làm:** ghi phiên bản Node/pnpm/Docker; chạy cài đặt, build shared/backend/dashboard, typecheck mobile, test backend/dashboard, lint hiện có, Prisma migration trên DB local mới. Ghi chính xác lệnh, kết quả và lỗi sẵn có; không chạy `lint --fix` trên phần code đang có thay đổi chưa commit.
- **Nghiệm thu:** một bảng kết quả theo package và lệnh tái hiện; phân biệt lỗi môi trường với lỗi code. Không mặc định rằng test e2e hiện tại (chỉ smoke `Hello World`) đại diện cho luồng nghiệp vụ.

### P00-02 — Kiểm kê API và phân quyền (P0, 1–2 ngày)

- **Làm:** liệt kê method/path/DTO/response/guard/role/kiểm tra owner cho mọi controller trong `server/attendance/src`; đối chiếu các call ở dashboard/mobile. Ghi các route không có guard và route có JWT nhưng phạm vi đọc quá rộng. Chỉ ra route cũ/không dùng và việc `/v0` không nhất quán với `/units`, `/tags`.
- **Nghiệm thu:** ma trận được review, mỗi route có quyết định public hay role/owner cụ thể; có danh sách lỗi cần sửa ở P01-01/P01-02.

### P00-03 — Chốt trạng thái và quy tắc điểm danh (P0, 1–2 ngày)

- **Làm:** xác định nghĩa của `VALID`, `REVIEW`, `REJECTED`; `REVIEW` có giữ chỗ hay tính là vắng; ai duyệt, thời hạn duyệt, cách chuyển thành present/absent/late/excused, có cho điểm danh lại không; xác định dữ liệu bằng chứng cần lưu và quyền xem/xóa. Xác định hành vi khi phiên đóng hoặc hủy giữa check-in.
- **Nghiệm thu:** sơ đồ chuyển trạng thái và bảng tình huống được chấp thuận; trường hợp `REVIEW` hiện bị ghi `present` có cách chuyển đổi dữ liệu và UI được chỉ rõ trước P02-06/P04-05.

### P00-04 — Chốt phạm vi pilot và chỉ số thành công (P0, 0.5–1 ngày)

- **Làm:** chọn số organizer/participant, số phiên đồng thời, platform Android/iOS, địa điểm/mạng, ngưỡng p95, tỷ lệ lỗi, thời gian khôi phục và thời gian giữ dữ liệu. Tách nhu cầu pilot khỏi tính năng sau pilot.
- **Nghiệm thu:** bảng mục tiêu có giá trị đo được và người quyết định; các bài tải ở P07-04 dùng đúng ngưỡng này, không lấy số 1.000/10 giây trong local perf làm SLA mặc định.

### P00-05 — Dựng bản đồ dữ liệu và sự cố (P0, 1 ngày)

- **Làm:** vẽ các bước tạo phiên → lưu criteria → job roster → Redis records → check-in → flush DB; nêu điểm có thể lỗi giữa DB/Redis, restart, mất Redis, job retry, hủy phiên. Ghi dữ liệu nào là nguồn chân lý ở từng thời điểm và cơ chế đối soát mong muốn.
- **Nghiệm thu:** danh sách failure mode có mã và task xử lý ở Phase 2; xác định rõ chính sách khi Redis/PostgreSQL không sẵn sàng.

### P00-06 — Chốt hợp đồng API và nâng cấp tương thích (P0, 1 ngày)

- **Làm:** chọn chiến lược version/prefix cho `/v0`, `/units`, `/tags`; thống nhất `ApiResponse<T>`, error codes, DTO ngày giờ và quyền; xác định có cần chuyển tiếp endpoint cũ trong pilot không. Ghi lệch hiện có giữa `docs/conventions/api-response.md` (đường dẫn ví dụ `error_codes`) và code thật (`response/codes`) để sửa theo quyết định chung, không đổi âm thầm.
- **Nghiệm thu:** có bảng endpoint cũ→mới, trình tự cập nhật shared/server/clients và test contract; không làm hỏng client hiện có giữa hai PR.

### P00-07 — Chốt kiến trúc triển khai và quyền vận hành (P0, 0.5–1 ngày)

- **Làm:** chọn môi trường staging/production, domain/TLS, nơi chạy API/PostgreSQL/Redis, nơi giữ secret và backup, người có quyền deploy/restore, cách phát hành mobile (internal distribution hay store). Ghi các quyết định cần phê duyệt chi phí hoặc tài khoản ngoài repo.
- **Nghiệm thu:** sơ đồ triển khai tối thiểu và danh sách biến môi trường; Phase 8 có target cụ thể để viết cấu hình.

## Cổng hoàn thành

P00-01 đến P00-07 có tài liệu/bằng chứng trong repo; các quyết định nghiệp vụ và phân quyền được xác nhận bởi người sở hữu sản phẩm. Các phase sau có thể bắt đầu phần độc lập, nhưng không migration trạng thái hay xây màn duyệt khi P00-03 chưa chốt.
