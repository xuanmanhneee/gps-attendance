# Phase 2 - Bảo mật và Authentication

## Đã triển khai

- Access token dùng `JWT_SECRET`, thời hạn lấy từ `EXPIRES_IN`.
- Refresh token dùng `REFRESH_TOKEN_SECRET`, thời hạn lấy từ
  `REFRESH_TOKEN_EXPIRES_IN`.
- Login trả về cả access token và refresh token.
- Có endpoint refresh:
  - `POST /v0/user/auth/refresh`
  - `POST /v0/admin/auth/refresh`
- Login giới hạn 5 request/phút.
- Check-in giới hạn 3 request/phút.
- Student chỉ được:
  - xem session đã được phân bổ qua `/v0/attendance-sessions/mine`
  - check-in session được phân bổ
  - xem lịch sử của chính mình
- Lecturer chỉ xem danh sách session do mình tạo; admin xem toàn bộ.
- Các route quản trị user/session được bảo vệ bằng `RolesGuard`.
- Mobile dùng Expo SecureStore cho access token, refresh token và session data.
- Password plaintext fallback đã bị loại bỏ.
- Seed password lấy từ biến môi trường `SEED_*_PASSWORD`.
- Login lỗi dùng thông báo chung `Invalid credentials`.

## Biến môi trường backend

```env
JWT_SECRET=...
EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=...
REFRESH_TOKEN_EXPIRES_IN=14d
```

Không commit giá trị secret thật vào repository. File `.env.example` chỉ là
template cho development.

## Việc còn lại

1. Thêm refresh-token rotation và revocation khi logout.
2. Bổ sung test RBAC/data isolation cho student, lecturer và admin.
3. Sửa tương thích Jest/ts-jest để e2e test chạy được.
4. Thêm validation environment khi server khởi động.