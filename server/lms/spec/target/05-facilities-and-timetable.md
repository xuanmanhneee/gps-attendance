# Facilities và Timetable

## 1. Mục tiêu

Facilities chỉ gồm Campus và Building. Mỗi Building tương ứng đúng một GPS
anchor cùng một bán kính mặc định. Timetable gắn ca học trực tiếp với Building.

Không có entity Room. Hệ thống không cố suy ra sinh viên đang ở phòng hoặc tầng
nào; geofence chỉ biểu diễn vùng xấp xỉ của toàn tòa.

## 2. Facility hierarchy

```text
Campus
└── Building
```

Ví dụ:

```text
CS1 — Cơ sở chính
├── A — Tòa A (11.940400, 108.458300, 50 m)
└── B — Tòa B (11.941200, 108.459100, 60 m)
```

### Quyền

- Admin tạo, sửa và deactivate Campus/Building.
- Lecturer đọc Building khi xem timetable hoặc tạo session.
- Student chỉ nhận label Building qua timetable/session response cần thiết.

### Rules

- Building code unique trong Campus; name có thể trùng.
- Campus phải active khi tạo Building.
- Không deactivate Campus còn Building active.
- Không hard delete Building đã được timetable/session tham chiếu.
- Mỗi Building bắt buộc có một latitude, longitude và default radius hợp lệ.
- Thay anchor/radius không sửa session đã tạo vì session lưu snapshot.
- Không có trạng thái “GPS đã xác minh”; admin chịu trách nhiệm cấu hình bằng
  map preview và kiểm thử thực địa.

### Cấu hình Building

Admin chọn điểm trên map hoặc nhập số. Form đồng thời hiển thị:

- Marker tại anchor.
- Vòng tròn theo `defaultRadiusMeters`.
- Latitude/longitude với precision phù hợp.
- Cảnh báo “Một Building tương ứng một vùng GPS dùng chung cho toàn tòa”.

Radius phải nằm trong giới hạn của Attendance contract. Spec không hardcode giá
trị vì giới hạn phải có một nguồn sự thật từ shared contract/config.

## 3. Timetable slot

### Weekly slot

```json
{
  "kind": "WEEKLY",
  "dayOfWeek": 2,
  "startMinute": 420,
  "endMinute": 570,
  "buildingId": "<uuid>"
}
```

### Date-specific slot

```json
{
  "kind": "DATE",
  "scheduledDate": "2026-11-16",
  "startMinute": 780,
  "endMinute": 900,
  "buildingId": "<uuid>"
}
```

DATE dùng cho học bù hoặc ca đặc biệt. Bản đầu không cần recurrence rule tổng
quát; WEEKLY và DATE đủ cho nghiệp vụ hiện tại.

## 4. Validation và conflict

- `endMinute > startMinute`, cùng một ngày và trong 0..1439.
- DATE phải nằm trong thời gian term của section.
- WEEKLY phải có day 1..7.
- Building phải active cùng Campus active.
- Section phải chưa CLOSED/ARCHIVED.
- Lecturer không được có slot trùng.
- Section không được có slot trùng.
- Building không được có slot trùng trong cùng phạm vi ngày.

Kiểm tra overlap chạy trong transaction có PostgreSQL advisory lock theo
lecturer, section và Building để request đồng thời không cùng vượt qua bước
read-check-write. Điều kiện overlap:

```text
existing.startMinute < requested.endMinute
AND requested.startMinute < existing.endMinute
```

Với WEEKLY, chỉ so slot cùng dayOfWeek và term có thời gian giao nhau. Với DATE,
so theo scheduledDate. DATE trùng occurrence WEEKLY được trả conflict trừ khi
API sau này có khái niệm thay thế/hủy occurrence rõ ràng.

## 5. Snapshot label

Khi tạo slot, service resolve:

```text
buildingLabelSnapshot = "Cơ sở chính / Tòa A"
```

Response trả `buildingId` và snapshot. Nếu Facility đổi tên:

- Slot cũ vẫn có label lịch sử.
- Admin có thể cập nhật slot để lấy label mới.
- Không chạy bulk update âm thầm.

## 6. Calendar query

`GET /api/timetable` nhận `from`, `to` và một trong các filter:

- `courseSectionId`
- `lecturerId`
- `studentId`
- `buildingId`

Service expand WEEKLY thành occurrence trong khoảng được hỏi rồi trộn DATE.

```json
{
  "slotId": "uuid",
  "date": "2026-11-16",
  "startAt": "2026-11-16T07:00:00+07:00",
  "endAt": "2026-11-16T09:30:00+07:00",
  "courseSection": { "id": "uuid", "code": "CT101-01", "name": "..." },
  "building": {
    "id": "uuid",
    "label": "Cơ sở chính / Tòa A",
    "latitude": 11.9404,
    "longitude": 108.4583,
    "defaultRadiusMeters": 50
  }
}
```

Timezone deployment được cấu hình một lần; timestamp database dùng UTC.

## 7. Tạo session từ timetable

Khi giảng viên chọn một occurrence, LMS prefill:

- Section và title.
- `openAt`/`closeAt`.
- Building, anchor và default radius.

Form cho chọn nguồn vị trí:

- `BUILDING`: dùng anchor/radius mặc định.
- `CURRENT`: lấy GPS thiết bị hiện tại rồi chọn radius.
- `MAP`: chọn tâm và radius trên bản đồ.

Trước submit, form luôn hiển thị marker, vòng bán kính và nguồn vị trí. Session
lưu snapshot latitude/longitude/radius nên thay Building sau đó không làm phiên
cũ dịch chuyển.

## 8. Module boundary

```text
Facilities
├── BuildingRepository
├── FacilityQuery
├── FacilityUsageQuery
└── ManageFacilityService

Timetable
├── TimetableRepository
├── AcademicSectionQuery
├── FacilityQuery
├── TimetableConflictChecker
├── ManageTimetableService
└── TimetableCalendarQuery
```

Timetable lưu `buildingId`; Facilities không import repository Timetable. Việc
chặn deactivate Building đang dùng đi qua `FacilityUsageQuery` do Timetable
expose.

## 9. Acceptance criteria

- Admin tạo Campus và Building với đúng một anchor/radius.
- Timetable chọn trực tiếp Building, không có Room trong schema/API/UI.
- Không tạo lịch sai term, sai giờ hoặc trùng section/lecturer/Building.
- Concurrent request không tạo được hai slot conflict.
- Đổi tên/anchor Building không làm mất label hoặc dịch chuyển session cũ.
- Calendar expand weekly slot đúng timezone.
- Tạo session từ lịch snapshot chính xác Building default hoặc GPS đã chọn.
