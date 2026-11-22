# Identity và Organization

## 1. Trách nhiệm

Identity sở hữu Account, password và token. Organization sở hữu hồ sơ User và
cây Unit. Hai feature liên kết qua `Account.userId`, nhưng không gộp account và
user thành một model.

## 2. Role và quyền

| Nghiệp vụ | Admin | Lecturer | Student |
|---|---:|---:|---:|
| Quản lý Unit | Có | Không | Không |
| Tạo/sửa User và Account | Có | Không | Không |
| Quản lý term/course/facility | Có | Chỉ đọc | Không |
| Tạo và sửa lớp học phần | Có | Không | Không |
| Xem lớp được phân công | Có | Có | Không |
| Quản lý roster | Có | Không | Không |
| Quản lý timetable | Có | Đề xuất ngoài MVP | Không |
| Tạo/hủy phiên điểm danh | Có | Lớp của mình | Không |
| Xem thống kê lớp | Có | Lớp của mình | Chỉ bản thân |
| Đăng nhập mobile | Có thể chặn | Có thể chặn | Có |

Server kiểm quyền theo role và ownership; frontend chỉ ẩn hành động để cải
thiện UX, không phải lớp bảo mật.

## 3. Authentication

### Login

1. Chuẩn hóa username lowercase và trim.
2. Tìm Account cùng User active.
3. Kiểm tra lockout và password bằng constant-time verifier.
4. Sai thông tin trả cùng một lỗi, không tiết lộ username tồn tại.
5. Thành công reset failed count, cấp access token và refresh token.
6. Chỉ lưu hash refresh token trong PostgreSQL.

Access token chứa tối thiểu:

```json
{
  "sub": "<user UUID>",
  "userCode": "SV001",
  "role": "student",
  "sessionId": "<refresh-session UUID>"
}
```

`sub` luôn là `User.id`. Service cần Account phải query qua quan hệ rõ ràng,
không nhầm `User.id` với `Account.id`.

### Refresh

- Refresh token rotation ở mỗi lần sử dụng.
- Token cũ bị revoke trong cùng transaction tạo token mới.
- Phát hiện reuse thì revoke toàn bộ chuỗi session đó.
- Logout thu hồi refresh session; access token tự hết hạn.

### Password

- Admin tạo account với mật khẩu tạm hoặc link kích hoạt.
- Không dùng mã sinh viên làm password mặc định.
- Không reset password khi import roster.
- Password không xuất hiện trong log, audit payload hoặc response.
- Đổi password thu hồi toàn bộ refresh session khác của user.

## 4. Unit

### Use cases

- Tạo Unit gốc hoặc Unit con.
- Sửa tên và parent.
- Deactivate/reactivate.
- Đọc cây Unit hoặc danh sách phẳng phục vụ combobox.

### Rules

- `code` không đổi sau khi tạo vì là external business key.
- Parent phải active khi tạo hoặc di chuyển Unit.
- Không tạo cycle.
- Deactivate không cascade âm thầm xuống con hoặc User.
- Mutation Unit ghi outbox `UNIT_UPSERTED`; deactivate ghi cùng event với
  `active=false` nếu Attendance contract hỗ trợ, nếu chưa thì chỉ ghi LMS.

## 5. User và Account

### Tạo User

Request admin gửi hồ sơ, role, Unit và thông tin account. Use case:

1. Validate code, role, unit và username.
2. Unit phải tồn tại và active.
3. Username, user code và email không được trùng.
4. Hash password ngoài transaction nếu thư viện hash không cần DB.
5. Trong transaction: tạo User, Account và `USER_UPSERTED` outbox event.
6. Trả User; không chờ Attendance phản hồi.

Admin không được tạo admin khác qua API MVP. Admin được cấp bằng seed hoặc lệnh
ops riêng để tránh endpoint quản trị có thể tự nâng quyền.

### Sửa User

- `code` và role không đổi bằng endpoint profile thông thường.
- Đổi role dùng endpoint riêng, chỉ admin, kiểm tra user không còn quan hệ gây
  xung đột. Ví dụ lecturer đang phụ trách section không được đổi thành student.
- Deactivate lecturer đang có section active bị từ chối.
- Deactivate student giữ enrollment lịch sử nhưng loại khỏi roster dùng cho
  phiên mới.

### Tìm kiếm

Danh sách user hỗ trợ `q`, `role`, `unitId`, `active`, `page`, `pageSize`.
`q` tìm theo code, fullName, username hoặc email bằng index phù hợp; không trả
password hash hoặc token metadata.

## 6. Ports và services

```text
Identity
├── AccountRepository
├── RefreshSessionRepository
├── PasswordHasher
├── TokenIssuer
└── AuthService

Organization
├── UserRepository
├── UnitRepository
├── UserDirectoryQuery
├── CreateUserService
└── ManageUnitService
```

Academic chỉ dùng `UserDirectoryQuery` để xác nhận lecturer/student, không gọi
thẳng `PrismaUserRepository`.

## 7. Audit tối thiểu

Ghi actor, action, target type/id, timestamp và requestId cho:

- Tạo/deactivate/reactivate user.
- Đổi role hoặc Unit.
- Reset password bởi admin.
- Tạo/deactivate/move Unit.

Không lưu password, password hash, JWT hoặc refresh token trong audit.

## 8. Acceptance criteria

- Chỉ admin tạo được Unit, User và Account.
- Lecturer/student không gọi được admin API dù tự sửa request frontend.
- User code, username và email không bị trùng dưới concurrent request.
- Unit cycle bị từ chối.
- Mobile student đăng nhập bằng LMS và refresh token hoạt động sau restart.
- Deactivate user chặn login mới và bị loại khỏi payload sync mới.
- Attendance tắt không làm request tạo user thất bại; trạng thái sync là pending.
