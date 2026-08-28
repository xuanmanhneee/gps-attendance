# Auth & Guards

- `JwtAuthGuard` dùng `AuthGuard('jwt')` của Passport — hoạt động qua
  strategy registry toàn cục (`JwtStrategy`), không qua NestJS DI thông
  thường. Vì vậy các module khác dùng `JwtAuthGuard` **không cần import
  `AuthModule`**, chỉ cần `AuthModule` đã được import ở `AppModule`.
- `@CurrentUser()` decorator trả về payload đã decode từ JWT — hiện tại
  `userId` trong payload là `User.id` (không phải `Account.id`).
- `User` và `Account` là 2 entity tách biệt (`UsersService` có cả
  `findById` theo `User.id` và `findByAccountId` theo `Account.id`) —
  luôn xác nhận rõ payload đang mang id nào trước khi query.