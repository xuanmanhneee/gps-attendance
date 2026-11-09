# Quy ước Xác thực & Auth Guards (Auth & Guards)

## 1. Cơ chế hoạt động của `JwtAuthGuard`

- `JwtAuthGuard` kế thừa trực tiếp từ `AuthGuard('jwt')` của Passport — hoạt động thông qua cơ chế sổ đăng ký chiến lược toàn cục (strategy registry của `JwtStrategy`), không thông qua hệ thống tiêm phụ thuộc (Dependency Injection) thông thường của NestJS.
- Do đó, các module nghiệp vụ khác trong hệ thống khi sử dụng `JwtAuthGuard` **hoàn toàn không cần import lại `AuthModule`**, chỉ cần `AuthModule` đã được import một lần duy nhất tại `AppModule`.

## 2. Phân định Danh tính Người dùng & Tài khoản (`User.id` vs `Account.id`)

- Decorator `@CurrentUser()` trả về payload đã được giải mã từ mã thông báo JWT — hiện tại trường `userId` trong payload mang giá trị của **`User.id`** (hồ sơ người dùng thực tế), **tuyệt đối không phải `Account.id`** (tài khoản đăng nhập).
- `User` và `Account` là hai thực thể (entity) tách biệt độc lập trong cơ sở dữ liệu (`UsersService` cung cấp cả phương thức `findById` theo `User.id` và `findByAccountId` theo `Account.id`).
- Luôn luôn xác định rõ ràng payload đang mang loại ID nào trước khi thực hiện truy vấn cơ sở dữ liệu để tránh nhầm lẫn nghiêm trọng giữa định danh bảo mật và định danh nghiệp vụ.
