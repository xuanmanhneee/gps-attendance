# Naming & Style

- File, folder: kebab-case (`attendance-sessions.service.ts`).
- Class, interface, type: PascalCase.
- Const object dùng như enum: PascalCase tên, SCREAMING_SNAKE_CASE giá
  trị, có `as const`.
- Comment nghiệp vụ phức tạp: tiếng Việt. Tên biến/hàm: tiếng Anh.
- Branch name: `feature/<mo-ta-ngan>` hoặc `feature/<MA-TICKET>-<mo-ta>`
  nếu có ticket; dùng `integration/<he-thong>` cho nhánh tích hợp với một
  hệ thống bên ngoài. Gộp chung 1 branch cho các thay đổi thuộc cùng 1 mục
  tiêu logic (ví dụ `users/me` + `attendance-sessions/me` cùng phục vụ
  "client lấy thông tin bản thân"), tách branch riêng khi thay đổi không
  liên quan nhau về mặt logic.
