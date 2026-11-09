# Quy ước Cấu trúc Module NestJS & Dependency Injection

Mỗi domain module trong hệ thống bắt buộc phải tuân theo cấu trúc phân tầng tiêu chuẩn sau:

```text
<domain>/
  <domain>.module.ts              # Khai báo module, controllers, providers và exports
  <domain>.controller.ts          # Định tuyến REST API, áp dụng guards và pipes
  <domain>.service.ts             # Xử lý logic nghiệp vụ, gọi qua Repository Token
  dto/
    create-<domain>.dto.ts        # Đối tượng truyền dữ liệu (Data Transfer Objects)
  repositories/
    mock-<domain>.repository.ts   # Triển khai mock dữ liệu phục vụ Unit Test
  <domain>.repository.ts          # Giao diện (Interface) trừu tượng của Repository
  <domain>.repository.token.ts    # Biểu tượng Symbol dùng làm DI Token
  <domain>.model.ts               # Định nghĩa thực thể dữ liệu nghiệp vụ thuần túy
```

## Các quy tắc bắt buộc:

1. **Nguyên tắc đảo ngược phụ thuộc (Dependency Inversion):**
   - Lớp `Service` tuyệt đối không được phụ thuộc trực tiếp vào triển khai cụ thể (concrete class) của repository.
   - Luôn luôn tiêm phụ thuộc thông qua Interface trừu tượng kết hợp với DI Token (`@Inject(XXX_REPOSITORY)`). Điều này cho phép dễ dàng hoán đổi giữa In-Memory mock repository (phục vụ test) và Prisma/Redis repository (trong production) mà không phải chỉnh sửa bất kỳ dòng mã nào trong Service.

2. **Khai báo đầy đủ thành phần trong Module:**
   - `<Domain>Module` bắt buộc phải khai báo đầy đủ danh sách `controllers`, `providers` và `exports`.
   - Lưu ý đặc biệt: Việc thiếu khai báo `controllers` là lỗi rất dễ gặp phải, khiến route API không được đăng ký vào hệ thống dù mã nguồn của Controller hoàn toàn không có lỗi cú pháp.

3. **Thứ tự ưu tiên định tuyến (Route Precedence):**
   - Các tuyến đường tĩnh (Static Routes như `me`, `tree`, `search`...) bắt buộc phải được khai báo **đứng trước** các tuyến đường động chứa tham số (Dynamic Parameterized Routes như `:id`) trong cùng một Controller.
   - Mục đích: Ngăn chặn NestJS match nhầm chuỗi tĩnh thành giá trị tham số động (Ví dụ điển hình: Tuyến `GET /users/me` bắt buộc phải đứng trước `GET /users/:id`).
