# Ranh giới tích hợp hệ thống ngoài

Attendance cung cấp inbound port HTTP trung tính tại `/v1/integration`. Port
này chỉ dùng ngôn ngữ domain Attendance: `Unit`, `User`, `Tag`, `Session`,
`organizer` và `participant`.

Adapter thuộc hệ thống ngoài hoặc một connector do đơn vị triển khai quản lý.
Adapter chịu trách nhiệm:

- Đọc API, webhook hoặc database hợp lệ của hệ thống nguồn.
- Ánh xạ entity và role nguồn sang contract Attendance.
- Tạo tên, external code và roster snapshot trước khi gửi.
- Giữ API key phía server; không chuyển token nguồn vào Attendance.

Không thêm `Course`, `Class`, `Lecturer`, `Student`, tên nhà cung cấp hoặc DTO
của hệ thống nguồn vào `server/attendance`. Nếu không kiểm soát mã nguồn hệ
thống ngoài, adapter phải là service độc lập; không chuyển phép ánh xạ vào
Attendance.

Module integration của Attendance chỉ xác thực service account, validate
contract trung tính, bảo đảm idempotency/external reference và gọi domain
service hiện có. Đây là inbound port, không phải adapter của một LMS cụ thể.
