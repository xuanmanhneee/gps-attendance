# Cấu trúc module (NestJS)

Mỗi domain module theo cấu trúc:

```
<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  dto/
    create-<domain>.dto.ts
  repositories/
    mock-<domain>.repository.ts   # implement trước, DB thật thay sau
  <domain>.repository.ts          # interface
  <domain>.repository.token.ts    # DI token
  <domain>.model.ts
```

**Quy tắc:**
- Service không phụ thuộc trực tiếp vào implementation của repository —
  luôn inject qua interface + DI token (`@Inject(XXX_REPOSITORY)`), để dễ
  swap mock repository sang DB thật sau này mà không sửa service.
- `<Domain>Module` phải khai báo đủ `controllers`, `providers`, `exports`
  — thiếu `controllers` là lỗi rất dễ mắc, route sẽ không được đăng ký dù
  code controller không có lỗi gì.
- Route tĩnh (`me`, `search`...) phải khai báo **trước** route động
  (`:id`) trong cùng controller, tránh bị NestJS match nhầm — ví dụ
  `GET /users/me` phải đứng trước `GET /users/:id`.