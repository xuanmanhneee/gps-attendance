# LMS target specification

## 1. Mục đích

Bộ tài liệu này là nguồn sự thật cho việc thay LMS demo Deno + SQLite bằng một
LMS học vụ độc lập dùng Express + PostgreSQL. LMS đủ hoàn chỉnh để quản lý tài
khoản, đơn vị, học kỳ, môn học, lớp học phần, danh sách sinh viên, lịch học và
tích hợp điểm danh; không cố trở thành hệ thống quản lý nội dung đào tạo.

Từ nhánh `origin/2312718_PhamNguyenNgocPhuoc_HopNhatHeThong`, thiết kế chỉ lấy
các nghiệp vụ có giá trị rõ ràng: mô hình học vụ, roster, timetable và quy tắc
phân quyền. Không mang academic model vào Attendance và không mô hình hóa phòng
học.

## 2. Tài liệu

| File | Nội dung |
|---|---|
| [`01-scope-and-architecture.md`](01-scope-and-architecture.md) | Phạm vi, ranh giới hệ thống, module và dependency rule |
| [`02-data-model.md`](02-data-model.md) | Schema PostgreSQL, quan hệ, constraint và ownership |
| [`03-identity-and-organization.md`](03-identity-and-organization.md) | Auth, role, user, account và unit |
| [`04-academic.md`](04-academic.md) | Học kỳ, môn học, lớp học phần và roster |
| [`05-facilities-and-timetable.md`](05-facilities-and-timetable.md) | Campus, Building và lịch học |
| [`06-attendance-integration.md`](06-attendance-integration.md) | Outbox, mapper, API key, mobile proxy và phiên điểm danh |
| [`07-reporting.md`](07-reporting.md) | API thống kê mock và nguồn dữ liệu Attendance thật |
| [`08-http-api.md`](08-http-api.md) | Quy ước HTTP, endpoint, validation và error code |
| [`09-web-application.md`](09-web-application.md) | Layout, navigation, component boundary và trạng thái UX |
| [`10-delivery-and-testing.md`](10-delivery-and-testing.md) | Migration, Docker, thứ tự triển khai và tiêu chí nghiệm thu |

## 3. Quyết định cố định

1. LMS và Attendance là hai backend độc lập, không import code hay đọc database
   của nhau.
2. LMS dùng role thật `admin`, `lecturer`, `student`. Chỉ module integration
   được biết role `organizer`, `participant` của Attendance.
3. LMS sở hữu dữ liệu học vụ và roster. Attendance sở hữu GPS, check-in, review
   và attendance record.
4. Tạo hoặc sửa dữ liệu LMS phải thành công ngay cả khi Attendance đang tắt.
   Đồng bộ được thực hiện tự động bằng transactional outbox.
5. Lớp học phần chỉ được tạo khi có giảng viên và danh sách sinh viên hợp lệ.
6. LMS chỉ có Campus và Building. Mỗi Building có đúng một tọa độ neo và một
   bán kính mặc định; không có entity Room.
7. Khi tạo phiên, LMS có thể prefill vị trí từ Building, vị trí hiện tại hoặc
   map picker rồi snapshot vào phiên. Attendance chịu trách nhiệm đánh giá GPS
   và accuracy của check-in.
8. Mobile đăng nhập bằng tài khoản LMS. API key Attendance chỉ tồn tại phía
   server và không bao giờ được gửi cho web/mobile.
9. Mọi API trả `ApiResponse<T>` theo convention của repo.
10. Bản đầu không có assignment, tài liệu học, quiz, gradebook, notification,
    multi-tenant hoặc SSO bên thứ ba.

## 4. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| Course | Môn học trong danh mục, ví dụ `CT101 - Lập trình căn bản` |
| Course section | Một lớp học phần của Course trong một học kỳ |
| Enrollment | Quan hệ sinh viên tham gia lớp học phần |
| Timetable slot | Một ca học lặp theo tuần hoặc diễn ra vào ngày cụ thể |
| Facility | Campus và Building có một tọa độ/bán kính mặc định |
| Session request | Yêu cầu LMS gửi sang Attendance để tạo phiên điểm danh |
| External code | Mã nghiệp vụ ổn định dùng để giao tiếp giữa hai hệ thống |
| Outbox event | Công việc tích hợp được ghi cùng transaction với dữ liệu LMS |

## 5. Cách sử dụng spec

- Implementation phải bám theo từng feature và acceptance criteria tương ứng.
- Nếu code hiện tại mâu thuẫn với target spec, giữ code hiện tại hoạt động cho
  đến khi phase migration tương ứng hoàn tất; không sửa nửa vời hai kiến trúc.
- Thay đổi ranh giới ownership hoặc contract tích hợp phải cập nhật tài liệu này
  và `docs/integration/integration-openapi.yaml` trong cùng pull request.
