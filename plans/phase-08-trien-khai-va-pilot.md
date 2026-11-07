# Phase 8 — Triển khai, pilot và bàn giao

**Ưu tiên:** P0 trước khi đưa dữ liệu thật vào môi trường mở. **Phụ thuộc:** cổng Phase 1, 2, 3, 4, 7; Phase 5/6 theo phạm vi pilot đã chốt. **Mục tiêu:** phát hành có thể lặp lại và rollback, vận hành một pilot có đo lường. **Ước lượng:** 8–15 ngày công cộng thời gian pilot; cần cập nhật sau khi chọn hạ tầng P00-07.

## Task theo thứ tự

### P08-01 — Tạo staging giống production (P0, 1–2 ngày)

- **Làm:** triển khai API, PostgreSQL, Redis, dashboard trên target P00-07; cấu hình domain/TLS, CORS, network riêng, storage bền vững, secret và health checks; tách tài khoản/dữ liệu staging khỏi production. `Dockerfile.perf` và `docker-compose.perf.yml` chỉ là công cụ đo tải, không dùng nguyên trạng để phát hành.
- **Nghiệm thu:** dựng lại staging từ hướng dẫn/IaC, không nhập secret bằng tay vào repo; mobile staging kết nối được bằng HTTPS; port DB/Redis không phơi public nếu không có nhu cầu.

### P08-02 — Quy trình migration, backup và restore (P0, 1–2 ngày)

- **Làm:** dùng migration đã review, chạy trước khi mở phiên bản API phụ thuộc; backup PostgreSQL và cấu hình Redis persistence theo RPO/RTO P00-04; kiểm tra restore trên môi trường tách biệt, đối soát record/job/criteria sau restore. Có kế hoạch cho migration không rollback trực tiếp: forward-fix hoặc restore dữ liệu.
- **Nghiệm thu:** restore thử thành công với dữ liệu mẫu và đo thời gian; checklist trước/sau migration, người phê duyệt và điểm dừng được ghi.

### P08-03 — Đóng gói và phát hành API/dashboard (P0, 1–2 ngày)

- **Làm:** production Dockerfile/build pipeline đúng thứ tự shared→Prisma generate→Nest build; chạy process với user không đặc quyền và health checks, cấu hình scale theo kết quả P07-04. Dashboard build với API URL môi trường, cache/static asset và route fallback đúng Vite/React Router. Gắn version/commit vào artifact và log.
- **Nghiệm thu:** cùng một artifact có thể deploy lại; smoke API/docs theo chính sách, đăng nhập và tạo phiên trên staging; rollback về version trước được diễn tập.

### P08-04 — Đóng gói mobile và phân phối pilot (P0, 1–2 ngày)

- **Làm:** EAS/dev-client hoặc pipeline native theo phạm vi Android/iOS đã chốt; app ID, signing, icon/splash, quyền vị trí, URL staging/production, version/update policy và attestation config. Phân biệt rõ bản test và bản phát hành, loại dev mode theo P03-06.
- **Nghiệm thu:** cài lên thiết bị pilot từ kênh phân phối đã chọn; đăng nhập/refresh/check-in qua HTTPS; không trỏ LAN hoặc staging trong bản production.

### P08-05 — Smoke test, diễn tập sự cố và go/no-go (P0, 1–2 ngày)

- **Làm:** chạy checklist ba role: tạo account, unit/tag, tạo/sửa/hủy phiên, roster, điểm danh hợp lệ/review/từ chối, duyệt, xem/export, flush, thống kê; thử restart API, mất Redis/DB ngắn, restore và rollback. Đối chiếu P00-04, lỗi P0/P1 còn mở, backup, alert và người trực.
- **Nghiệm thu:** biên bản go/no-go có bằng chứng test, chấp nhận rủi ro còn lại và người quyết định. Không mở pilot nếu còn lỗi P0 về quyền, mất dữ liệu hoặc trạng thái điểm danh sai.

### P08-06 — Pilot có giám sát và phản hồi (P1, theo lịch pilot)

- **Làm:** triển khai trước cho nhóm nhỏ, hỗ trợ người dùng, ghi tỷ lệ login/check-in thành công, review, GPS kém, p95, lỗi, chênh lệch dữ liệu và ticket; có quy trình sửa record được audit. Tổ chức retrospective sau các phiên đầu, ưu tiên bug ảnh hưởng kết quả trước thay đổi UI đẹp mắt.
- **Nghiệm thu:** dữ liệu các phiên pilot đã đối soát Redis/PostgreSQL/export; các tình huống thất bại được phân loại và xử lý; người dùng thử xác nhận quy trình hoạt động.

### P08-07 — Chốt phát hành và bàn giao (P1, 1 ngày)

- **Làm:** cập nhật runbook, dashboard giám sát, danh sách người chịu trách nhiệm, backup schedule, cách cấp/thu hồi admin và kế hoạch bảo trì; chuyển các cải tiến P2 sang backlog có ưu tiên. Gắn tag/version, ghi release notes và thay đổi API/schema quan trọng.
- **Nghiệm thu:** người vận hành khác có thể deploy, rollback, restore và tra cứu sự cố theo tài liệu; pilot có báo cáo quyết định mở rộng hoặc tiếp tục sửa.

## Cổng hoàn thành

Hệ thống pilot chạy trên hạ tầng mục tiêu, có artifact/version rõ, backup restore và rollback đã thử; kết quả phiên được đối soát; go/no-go ký theo tiêu chí P00-04. Việc mở rộng sau pilot chỉ bắt đầu sau khi xử lý lỗi chặn và cập nhật kế hoạch theo dữ liệu thực.
