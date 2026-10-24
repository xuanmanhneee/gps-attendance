# AGENTS.md — gps-attendance

Repo này có tài liệu quy ước chi tiết đặt trong `docs/conventions/`.
Trước khi thêm hoặc sửa code, đọc **toàn bộ các file** trong thư mục đó,
không chỉ file này — file này chỉ là mục lục.

## Danh sách tài liệu

| File | Nội dung |
|---|---|
| `docs/conventions/api-response.md` | Format `ApiResponse<T>`, quy ước error code |
| `docs/conventions/module-structure.md` | Cấu trúc thư mục module NestJS, DI qua repository interface, thứ tự route |
| `docs/conventions/auth-guards.md` | Cách `JwtAuthGuard` hoạt động, `User` vs `Account` id |
| `docs/conventions/naming.md` | Quy ước đặt tên file/class/const, quy ước branch |
| `docs/conventions/roles.md` | Role trung tính và ranh giới ánh xạ với hệ thống bên ngoài |

## Nguyên tắc chung

- Convention trong `docs/conventions/` là nguồn tham chiếu chính, ưu
  tiên hơn suy đoán từ code có sẵn nếu có mâu thuẫn.
- Khi thêm 1 quy ước mới, tạo file mới trong `docs/conventions/` (không
  thêm thẳng vào file này) và cập nhật bảng danh sách ở trên.
- Nếu chưa chắc quy ước cho 1 trường hợp cụ thể, hỏi lại thay vì tự suy
  đoán và áp dụng khác với domain khác trong repo.
