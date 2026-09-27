# Kiểm kê hiện trạng - Giai đoạn 1

Ngày kiểm kê: 2026-09-18

## 1. Phạm vi

Giai đoạn này chỉ xác định hiện trạng thực tế của API, cấu hình client và lớp
lưu trữ. Chưa thay đổi nghiệp vụ, schema hoặc cách DI repository.

## 2. API backend hiện có

| Nhóm | Method | Path | Quyền |
|---|---|---|---|
| Auth | POST | `/v0/user/auth/login` | Public, student |
| Auth | POST | `/v0/admin/auth/login` | Public, admin/lecturer |
| Users | GET | `/users/me` | JWT |
| Users | GET | `/users` | JWT |
| Users | GET | `/users/:id` | JWT |
| Sessions | POST | `/v0/attendance-sessions` | JWT, admin/lecturer |
| Sessions | GET | `/v0/attendance-sessions` | JWT |
| Sessions | GET | `/v0/attendance-sessions/mine` | JWT |
| Sessions | GET | `/v0/attendance-sessions/:id` | JWT |
| Sessions | GET | `/v0/attendance-sessions/:id/detail` | JWT |
| Sessions | GET | `/v0/attendance-sessions/by-user/:userId` | JWT |
| Sessions | DELETE | `/v0/attendance-sessions/:id` | JWT, admin/lecturer |
| Check-in | POST | `/attendance/check-in` | JWT |
| Records | GET | `/attendance/records/mine` | JWT |
| Docs | GET | `/api-docs` | Public |

Các controller session, check-in và record còn hỗ trợ alias không có prefix
`v0`, nhưng client hiện dùng phiên bản có prefix cho session và phiên bản không
prefix cho check-in/records.

## 3. Client API đối chiếu

### Mobile

- Login: có backend tương ứng.
- Session mine/detail: có backend tương ứng.
- Check-in và history: có backend tương ứng.
- `logout` và `refreshToken`: client có khai báo nhưng backend chưa có route.
- `getAttendanceRecord`: client trả lỗi cố định vì backend chưa có API chi tiết.

### Admin dashboard

- Login, session create/list/detail/delete và user profile đều có backend tương ứng.
- API base URL lấy từ `VITE_API_BASE_URL`.

## 4. Lớp lưu trữ đang được inject

| Domain | Implementation hiện tại | Nhận xét |
|---|---|---|
| Account | `PrismaAccountRepository` | PostgreSQL |
| User | `PrismaUserRepository` | PostgreSQL |
| Session | `PrismaAttendanceSessionRepository` | PostgreSQL |
| Record | `PrismaAttendanceRecordRepository` | PostgreSQL |
| Check-in attempts | `PrismaAttendanceCheckInStore` | PostgreSQL, đếm qua `AttendanceAttempt` |
| Device usage | `PrismaAttendanceCheckInStore` | PostgreSQL, kiểm tra qua `AttendanceRecord.deviceId` |

Các mock repository vẫn tồn tại cho development/test nhưng không được module
chính inject ở thời điểm kiểm kê. Không còn in-memory store được module chính
inject.

## 5. Cấu hình môi trường

- Mobile: `EXPO_PUBLIC_API_URL=http://192.168.1.12:3000`.
- Mobile LAN: `MOBILE_DEV_IP=192.168.1.12`.
- Dashboard: `VITE_API_BASE_URL`.
- Dashboard truyền biến này trực tiếp vào shared HTTP client; hiện chưa có
	fallback hoặc validation rõ ràng khi biến bị thiếu.
- Backend: `PORT` mặc định `3000`, bind `0.0.0.0`.
- Database: `DATABASE_URL` bắt buộc khi khởi động backend.

## 6. Khoảng trống cần xử lý ở giai đoạn sau

1. Persist attempt và device usage bằng PostgreSQL, có transaction/constraint.
2. Bổ sung logout/revocation nếu cần vô hiệu hóa refresh token trước hạn.
3. Bổ sung API chi tiết attendance record nếu mobile cần chức năng này.
4. Bổ sung test cho các route nghiệp vụ thay cho e2e test hiện chỉ kiểm tra root.
5. Đồng bộ API contract và tài liệu từ một nguồn duy nhất.
6. Thêm validation/fallback có chủ đích cho `VITE_API_BASE_URL`.

## 7. Kết quả thực thi

- Migration `20260918000000_phase1_indexes` đã được áp dụng thành công.
- Prisma seed đã chạy thành công với `NODE_ENV=development`.
- Backend build thành công.
- Unit test hiện không có test tự động.
- E2E test đang bị blocker bởi tương thích Jest/ts-jest trước khi test chạy.