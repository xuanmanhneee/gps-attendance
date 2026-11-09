# Quy ước Đặt tên & Phong cách Lập trình (Naming & Style)

## 1. Quy ước đặt tên trong mã nguồn

- **Tên file và tên thư mục:** Luôn sử dụng định dạng `kebab-case` chữ thường, phân cách bởi dấu gạch nối (Ví dụ: `attendance-sessions.service.ts`, `location-registry.controller.ts`).
- **Tên Class, Interface, Type và Decorator:** Luôn sử dụng định dạng `PascalCase` viết hoa chữ cái đầu mỗi từ (Ví dụ: `AttendanceSessionService`, `CreateAccountDto`, `IAttendanceRecordBuffer`).
- **Hằng số đối tượng dùng làm Enum:** Tên hằng viết theo `PascalCase`, các giá trị thuộc tính bên trong viết hoa toàn bộ dạng `SCREAMING_SNAKE_CASE`, và luôn kèm từ khóa `as const` ở cuối.
- **Ngôn ngữ trong mã nguồn:**
  - Tên biến, tên hàm, tên phương thức, tên lớp và thuộc tính: Bắt buộc dùng **Tiếng Anh chuẩn kỹ thuật**.
  - Chú thích giải thích logic nghiệp vụ phức tạp, ghi chú bảo mật và tài liệu kỹ thuật: Bắt buộc dùng **Tiếng Việt có dấu rõ ràng, mạch lạc**.

## 2. Quy ước đặt tên nhánh Git (Git Branching Convention)

- Định dạng tên nhánh: `feature/<mo-ta-ngan>` hoặc `feature/<MA-TICKET>-<mo-ta>` (nếu có mã ticket công việc).
- **Nguyên tắc gom nhánh:** Gộp chung một nhánh cho các thay đổi có cùng một mục tiêu logic nghiệp vụ (Ví dụ: Cả endpoint `users/me` và `attendance-sessions/me` cùng phục vụ bài toán "Client lấy dữ liệu bản thân", nên thực hiện chung trong cùng một nhánh).
- **Nguyên tắc tách nhánh:** Tách thành các nhánh độc lập khi các thay đổi không có sự liên quan logic với nhau để dễ dàng cô lập kiểm thử và review mã nguồn.
