# Reporting

## 1. Phạm vi

Reporting cung cấp thống kê điểm danh theo lớp và theo sinh viên. Nó không sở
hữu check-in record và không ghi lại toàn bộ Attendance database.

Bản đầu giữ một API contract ổn định với hai implementation:

- `MockAttendanceStatisticsProvider`: dữ liệu ổn định để phát triển UI.
- `AttendanceStatisticsProvider`: đọc session/record thật qua integration API.

Chọn provider bằng cấu hình server; response luôn cho biết `source`.

## 2. Trạng thái và công thức

Chỉ phiên đã đóng/finalized được tính. Phiên pending, cancelled hoặc chưa mở bị
loại khỏi mẫu số.

| Metric | Công thức |
|---|---|
| `finalizedSessionCount` | Số phiên hợp lệ đã kết thúc |
| `presentCount` | Record đúng giờ |
| `lateCount` | Record đi trễ |
| `absentCount` | Không có record hợp lệ khi phiên kết thúc |
| `excusedCount` | Vắng có phép đã được chốt |
| `attendedCount` | `presentCount + lateCount` |
| `eligibleSessionCount` | `finalizedSessionCount - excusedCount` |
| `attendanceRate` | `attendedCount / eligibleSessionCount * 100` |

Nếu `eligibleSessionCount = 0`, `attendanceRate = null`, không trả NaN hoặc 0
gây hiểu nhầm. Tỷ lệ làm tròn một chữ số ở response presenter, không làm tròn
từng thành phần trước khi tính.

## 3. API lớp học phần

`GET /api/course-sections/:id/attendance-summary`

```json
{
  "success": true,
  "data": {
    "source": "mock",
    "courseSection": {
      "id": "uuid",
      "code": "CT101-01",
      "name": "Lập trình căn bản - Nhóm 01"
    },
    "finalizedSessionCount": 12,
    "students": [
      {
        "student": { "code": "SV001", "fullName": "Trần Minh Anh" },
        "presentCount": 8,
        "lateCount": 2,
        "absentCount": 1,
        "excusedCount": 1,
        "attendedCount": 10,
        "eligibleSessionCount": 11,
        "attendanceRate": 90.9
      }
    ],
    "generatedAt": "2026-11-10T07:00:00Z"
  }
}
```

Hỗ trợ sort theo code, fullName, absentCount hoặc attendanceRate. Filter phía
server theo `q` để lớp lớn không buộc frontend xử lý toàn bộ.

## 4. API một sinh viên trong lớp

`GET /api/course-sections/:sectionId/students/:studentCode/attendance-summary`

Ngoài tổng số, trả danh sách session đã finalized:

```json
{
  "sessionExternalId": "...",
  "title": "Buổi 05",
  "openAt": "...",
  "status": "PRESENT | LATE | ABSENT | EXCUSED",
  "checkedInAt": "... hoặc null"
}
```

Admin xem mọi student. Lecturer chỉ xem lớp mình. Student chỉ xem chính mình
qua endpoint `/api/me/attendance-summary?courseSectionId=...`.

## 5. Mock provider

Mock phải deterministic theo `sectionId + studentCode`, không dùng random mỗi
request. Mục tiêu là giúp UI ổn định khi reload và viết visual test.

Mock lấy roster thật từ LMS và sinh:

- 12 phiên finalized cố định.
- Các count luôn không âm và tổng bằng 12.
- Có đủ trường hợp perfect, late, absent, excused và rate null trong fixture
  test riêng.

Mock chỉ chạy khi `LMS_REPORTING_SOURCE=mock`. Response production phải hiển
thị source thật, không silent fallback sang mock khi Attendance lỗi.

## 6. Provider thật

Provider thật:

1. Đọc section và kiểm quyền từ LMS.
2. Lấy danh sách session request đã SYNCED của section.
3. Batch đọc record theo integration API.
4. Chuẩn hóa status và tính summary trong LMS reporting service.
5. Nếu một session không đọc được, trả lỗi dịch vụ thay vì âm thầm bỏ session.

Nếu hiệu năng không đủ sau khi có số liệu thật, mới bổ sung endpoint aggregate
phía Attendance hoặc cache ngắn hạn. MVP không tạo bảng đồng bộ toàn bộ record.

## 7. Abstraction

```typescript
interface AttendanceStatisticsProvider {
  getSectionRecords(sectionId: string): Promise<FinalizedSessionRecords>;
}
```

`AttendanceSummaryService` sở hữu công thức. Provider chỉ trả dữ liệu chuẩn hóa,
không tự tính tỷ lệ để mock và real không lệch nhau.

## 8. UI states

- Skeleton khi tải.
- Empty state khi chưa có phiên finalized.
- Badge “Dữ liệu mẫu” khi source mock.
- Error state có retry khi Attendance không sẵn sàng.
- Không đổi sang mock tự động khi real provider lỗi.

## 9. Acceptance criteria

- Mock trả ổn định qua nhiều request.
- Tổng trạng thái bằng finalized session count cho mỗi sinh viên.
- Excused không làm giảm attendance rate.
- Student không xem được số liệu người khác.
- Lecturer không xem được lớp ngoài ownership.
- Lỗi Attendance được thể hiện rõ, không biến thành bảng rỗng/dữ liệu mock.
