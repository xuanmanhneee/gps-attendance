# Phase 3 - Logic điểm danh và chống gian lận GPS

## Đã triển khai

- Session status được tính từ thời gian UTC của `openAt` và `closeAt`:
  `pending` -> `open` -> `closed`.
- Backend bắt buộc `closeAt` sau `openAt`.
- Tọa độ check-in dùng validator latitude/longitude chuẩn.
- GPS accuracy hợp lệ trong khoảng `0..1000` mét (sai số, không dùng để cộng vào khoảng cách).
- Vị trí: chắc chắn ngoài (`distance - accuracy > radius`) mới REJECTED `OUT_OF_RANGE`.
  Đứng trong bán kính với GPS kém → hệ số chồng lấn, thường REVIEW chứ không từ chối.
- Radius session bắt buộc lớn hơn 0.
- `AttendanceRecord(sessionId, userId)` có unique compound key.
- Mọi request check-in hợp lệ tới session tạo một `AttendanceAttempt` audit log.
- Audit log lưu:
  - latitude/longitude
  - accuracy
  - distance to center
  - device ID
  - mock-location flag
  - server timestamp
  - result `APPROVED`, `REVIEW` hoặc `REJECTED`
  - danh sách reasons
- Attempt được ghi cả khi user chưa được phân bổ hoặc đã check-in trước đó.
- Device đã dùng bởi một sinh viên trong session sẽ bị từ chối khi sinh viên khác
  sử dụng lại.
- Server dùng `new Date()` làm thời điểm check-in; timestamp từ mobile chỉ là
  metadata và không dùng để quyết định thời gian điểm danh.

## Database

Migration đã áp dụng:

`20260918000100_attendance_attempt_audit`

Migration bổ sung audit columns, index theo device/user và CHECK constraint cho
tọa độ, radius, accuracy và distance.