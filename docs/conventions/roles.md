# Role trong hệ thống điểm danh

## Role hệ thống

Hệ thống dùng đúng ba role: `admin`, `organizer`, `participant`.

| Role | Quyền chính |
|---|---|
| `admin` | Quản trị tài khoản và dữ liệu hệ thống |
| `organizer` | Tạo và quản lý phiên điểm danh |
| `participant` | Xem phiên của mình và điểm danh |

`Role` trong Prisma, JWT, API DTO, guard, dashboard và mobile client cùng mang
ba giá trị này. Dashboard và mobile client là thành phần của hệ thống điểm danh,
nên dùng role hệ thống trực tiếp khi kiểm tra luồng giao diện. Server luôn là nơi
quyết định quyền truy cập API.

Tài khoản `admin` được cấp qua seed hoặc thao tác trực tiếp trên server. API tạo
tài khoản yêu cầu đăng nhập với role `admin` và chỉ tạo `organizer` hoặc
`participant`.

## Tích hợp hệ thống bên ngoài

Ứng dụng bên ngoài (ví dụ LMS) tự ánh xạ role hệ thống ở ranh giới tích hợp.
Ví dụ, ứng dụng trường học có thể hiển thị `organizer` là giảng viên và
`participant` là sinh viên; ứng dụng công ty có thể dùng nhãn khác. Các tên
nghiệp vụ đó không trở thành role trong API điểm danh.

Không dùng kiểu union giữa role cũ (`lecturer`, `student`) và role mới trong
DTO chính. Có thể chia thay đổi code thành các đợt nhỏ để review, nhưng chỉ
triển khai sau khi migration dữ liệu, API, seed và hai client đều dùng role mới.
