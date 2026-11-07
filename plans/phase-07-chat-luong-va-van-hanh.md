# Phase 7 — Chất lượng, hiệu năng và khả năng vận hành

**Ưu tiên:** P1, các cổng test/backup/giám sát trước pilot là P0. **Phụ thuộc:** luồng chính Phase 1–6. **Mục tiêu:** biết khi hệ thống lỗi, tái hiện được và phục hồi có kiểm soát. **Ước lượng:** 10–17 ngày công.

## Task theo thứ tự

### P07-01 — Pipeline kiểm tra tự động (P0, 1–2 ngày)

- **Làm:** thêm scripts không sửa file cho lint/typecheck/test trong từng package; CI chạy `pnpm install --frozen-lockfile`, Prisma generate, build shared→server/dashboard, test backend/dashboard, lint mobile, kiểm tra migration và secrets/dependency theo khả năng công cụ. `server/attendance` hiện có `lint` với `--fix`; CI cần lệnh lint chỉ kiểm tra. Mobile chưa có test runner tự động, ghi rõ gate thiết bị thủ công.
- **Nghiệm thu:** PR lỗi build/test/lint không thể qua gate; CI chạy từ checkout mới không cần file `.env` thật hoặc service production.

### P07-02 — Test tích hợp và hợp đồng API (P0, 2–3 ngày)

- **Làm:** dựng fixture PostgreSQL/Redis riêng; test login/refresh/logout, role/owner, tạo-sửa-hủy phiên, roster, check-in, review, flush, export và API thống kê. Kiểm tra `ApiResponse<T>` và error codes giữa shared/backend/clients; thay e2e smoke `Hello World` bằng các ca có giá trị nghiệp vụ.
- **Nghiệm thu:** chạy lặp lại và trên CI không phụ thuộc thứ tự test; DB/Redis test được dọn an toàn; lỗi contract làm CI đỏ.

### P07-03 — Kiểm thử UI theo rủi ro (P1, 1–2 ngày)

- **Làm:** giữ unit test logic thuần hiện có; thêm kiểm thử tối thiểu cho hành vi chỉ có trong JSX (wizard bước 1/2, disable gửi, menu theo role, review decision, login/refresh). Chọn test component hoặc E2E browser theo chi phí, tránh test chỉ sao chép implementation.
- **Nghiệm thu:** lỗi từng gây thành công giả, lộ menu, gửi lặp hoặc sai giờ có test tái hiện; chạy được trong CI.

### P07-04 — Đo tải end-to-end theo mục tiêu pilot (P0, 2–3 ngày)

- **Làm:** dùng perf stack hiện có làm nền; đo riêng tạo phiên, lọc criteria, khởi tạo roster, 1.000/N check-in đồng thời, đọc dashboard/mobile, flush và retry sau DB lỗi. Chạy trên staging cấu hình gần production; ghi p50/p95/p99, lỗi, dropped iterations, CPU/RAM, Redis/DB và số bản ghi đối soát. Không suy rộng kết quả local 2026-10-23.
- **Nghiệm thu:** mục tiêu P00-04 đạt không có mất/trùng dữ liệu; bottleneck và giới hạn tài nguyên được ghi, có kế hoạch giảm tải nếu vượt.

### P07-05 — Giám sát và cảnh báo (P0, 1–2 ngày)

- **Làm:** health/readiness cho API, PostgreSQL, Redis; metric lượng check-in theo status/reason, độ trễ, backlog job, roster chậm, flush chậm/lỗi, chênh lệch Redis-DB, refresh fail; structured log/correlation ID và redaction GPS/token. Đặt alert có ngưỡng và người nhận theo runbook, không log toàn bộ body check-in.
- **Nghiệm thu:** cố ý gây lỗi DB/Redis/job làm cảnh báo xuất hiện; người vận hành truy được request/job liên quan mà không lộ bí mật.

### P07-06 — Tài liệu vận hành và đồng bộ tài liệu repo (P1, 1–2 ngày)

- **Làm:** cập nhật root/server/admin/mobile README, `docs/architecture.md` và `client/admin-dashboard/ARCHITECTURE.md` cho role, endpoint, token, trạng thái và cấu trúc thật; thay template README; viết runbook start/stop, migration, backup/restore, kiểm tra hàng chờ, đối soát, incident và rollback. Nếu thêm quy ước code mới, tạo file trong `docs/conventions/` và cập nhật mục lục `AGENTS.md`.
- **Nghiệm thu:** thành viên khác làm theo runbook trên staging từ đầu đến cuối; ví dụ lệnh/port/biến môi trường đúng; không còn mô tả `student`/logout/đường dẫn cũ gây hiểu sai.

### P07-07 — Rà dữ liệu nhạy cảm và dependency (P1, 1–2 ngày)

- **Làm:** kiểm tra vị trí lưu token web/mobile, CORS/CSP/TLS, dependency dư như `xlsx`/`axios` ở dashboard, quyền secret CI, log và export GPS/device; cập nhật phụ thuộc có kiểm thử hồi quy, ghi SBOM hoặc danh sách phiên bản triển khai. Tránh nâng cấp lớn sát pilot nếu không bắt buộc.
- **Nghiệm thu:** không có credential/demo secret trong artifact; phát hiện bảo mật mức nghiêm trọng được xử lý hoặc có quyết định chấp nhận rủi ro rõ; build lặp lại từ lockfile.

## Cổng hoàn thành

CI, test tích hợp, đo tải, giám sát và runbook chứng minh các luồng chính và failure mode đáp ứng mục tiêu pilot. Có người nhận cảnh báo, cách đối soát và cách khôi phục đã diễn tập.
