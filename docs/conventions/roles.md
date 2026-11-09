# Quy ước Ba Role Hệ Thống Điểm Danh (System Roles)

## 1. Danh sách Role Hệ thống Chuẩn hóa

Hệ thống điểm danh GPS chuẩn hóa đồng bộ và sử dụng duy nhất **ba role trung tính**: `admin`, `organizer`, `participant`.

| Role Hệ Thống | Đối Tượng Áp Dụng | Quyền Hạn & Trách Nhiệm Cốt Lõi |
|---|---|---|
| `admin` | Quản trị viên hệ thống | Toàn quyền quản trị tài khoản, danh mục cơ sở vật chất (Campus, Building, Room), cơ cấu tổ chức (Unit), gắn thẻ (Tag) và phân quyền bảo mật. |
| `organizer` | Người tổ chức / Giảng viên | Tạo và quản lý cấu hình các phiên điểm danh, xem danh sách sinh viên ghi danh, theo dõi tiến độ check-in thời gian thực, phê duyệt hoặc từ chối các yêu cầu giải trình (Review). |
| `participant` | Người tham gia / Sinh viên | Tra cứu danh sách các phiên học được phân công, thực hiện check-in GPS, gửi giải trình khi rơi vào trạng thái Review, tra cứu lịch sử điểm danh cá nhân. |

**Phạm vi áp dụng đồng bộ:**
- Kiểu dữ liệu `Role` trong Schema Prisma, mã thông báo bảo mật JWT, các DTO của API, các bộ lọc bảo vệ Guard, giao diện Web Admin Dashboard và ứng dụng Mobile Client đều sử dụng đồng nhất ba giá trị này.
- Giao diện Admin Dashboard và Mobile Client là các thành phần trực thuộc hệ thống, do đó sử dụng trực tiếp các role này để kiểm soát luồng hiển thị. Server luôn là nơi nắm quyền tối cao quyết định quyền truy cập API.
- Tài khoản mang role `admin` chỉ được khởi tạo qua mã seed cơ sở dữ liệu ban đầu hoặc thao tác trực tiếp trên máy chủ. API tạo tài khoản người dùng bắt buộc yêu cầu đăng nhập với role `admin` và chỉ được phép tạo tài khoản có role `organizer` hoặc `participant`.

## 2. Ranh giới Tích hợp với Hệ thống Bên Ngoài

- Các ứng dụng bên ngoài (Ví dụ: Hệ thống quản lý học tập LMS Canvas, Blackboard, hoặc phần mềm quản lý nhân sự HRM) tự thực hiện việc ánh xạ role hệ thống tại ranh giới tích hợp (Integration Boundary / API Adapter).
- **Ví dụ thực tế:** Một ứng dụng quản lý trường đại học có thể hiển thị `organizer` với nhãn "Giảng viên" và `participant` với nhãn "Sinh viên"; một ứng dụng doanh nghiệp có thể hiển thị là "Quản lý ca" và "Nhân viên". Các danh xưng nghiệp vụ riêng biệt đó tuyệt đối không trở thành giá trị role bên trong API điểm danh cốt lõi.
- **Tuyệt đối không dùng kiểu kết hợp (union type)** giữa các role cũ (`lecturer`, `student`) và các role mới trong các DTO chính của hệ thống.
