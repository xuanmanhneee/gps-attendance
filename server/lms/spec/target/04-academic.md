# Academic core

## 1. Trách nhiệm

Academic sở hữu học kỳ, môn học, lớp học phần và enrollment. Feature này không
biết HTTP contract của Attendance và không chứa logic GPS.

## 2. Academic term

### Use cases

- Tạo và cập nhật term khi chưa closed.
- Chuyển trạng thái `DRAFT → ACTIVE → CLOSED`.
- Liệt kê theo năm/ngày/trạng thái.

### Rules

- Code duy nhất và không đổi.
- `endDate >= startDate`.
- Không đưa term về DRAFT sau khi đã ACTIVE.
- CLOSED không nhận section mới hoặc timetable mutation.
- Không xóa term đã có section.

## 3. Course

Course là danh mục môn học tái sử dụng giữa nhiều học kỳ.

### Rules

- Code duy nhất toàn LMS.
- Owning Unit phải active.
- Credits nếu có nằm trong 1..20.
- Course inactive không được dùng tạo section mới nhưng section lịch sử vẫn đọc
  được.
- Đổi tên Course không tự đổi tên section đã tạo.

## 4. Course section

### Tạo lớp học phần

Admin gửi cùng lúc:

```json
{
  "code": "CT101-01",
  "name": "Lập trình căn bản - Nhóm 01",
  "courseId": "<uuid>",
  "termId": "<uuid>",
  "lecturerCode": "GV001",
  "capacity": 60,
  "studentCodes": ["SV001", "SV002"]
}
```

`studentCodes` là bắt buộc và có ít nhất một phần tử. Không tạo section rỗng
rồi kỳ vọng sync sau.

Use case thực hiện:

1. Chuẩn hóa code và loại student code trùng.
2. Course active, term chưa closed.
3. Lecturer tồn tại, active và có role lecturer.
4. Tất cả student tồn tại, active và có role student.
5. Số student không vượt capacity nếu capacity có giá trị.
6. Trong một transaction tạo section, enrollments và `SECTION_UPSERTED` event.

Nếu bất kỳ student code nào không hợp lệ, toàn bộ request thất bại và trả danh
sách code lỗi; không tạo lớp một phần.

### Cập nhật lớp

- Có thể đổi name, lecturer, capacity và status.
- Đổi lecturer phải kiểm role/active và tạo event sync mới.
- Không hạ capacity xuống dưới số enrollment active.
- CLOSED chặn roster/timetable mới; ARCHIVED chỉ đọc lịch sử.
- Code/course/term không đổi sau khi section được tạo.

### Quyền đọc

- Admin đọc mọi section.
- Lecturer chỉ đọc section mình phụ trách.
- Student dùng API mobile/profile riêng để đọc section đang enroll; không dùng
  admin list endpoint.

## 5. Roster và enrollment

### Thêm sinh viên

- Chỉ admin.
- Student phải active và đúng role.
- Add lặp lại student active là idempotent.
- Enrollment DROPPED được kích hoạt lại và cập nhật `enrolledAt`.
- Mỗi thay đổi roster tạo `SECTION_UPSERTED` chứa snapshot roster mới.

### Gỡ sinh viên

- Không delete row; chuyển `DROPPED`, đặt `droppedAt`.
- Không sửa roster snapshot của session đã tạo trước đó.
- Sinh viên dropped không thấy phiên LMS tạo sau thời điểm dropped.

### Replace roster

Endpoint replace nhận danh sách cuối cùng mong muốn. Service tính diff:

```text
toAdd      = requested - currentActive
toDrop     = currentActive - requested
unchanged  = intersection
```

Tất cả validate trước khi mutation. Thay roster và ghi một outbox event trong
cùng transaction, không tạo một event cho từng student.

## 6. Import roster

Bản đầu không cần job queue. Giới hạn tối đa 500 dòng mỗi file; lớn hơn yêu cầu
chia file. Frontend đọc CSV/XLSX và gửi rows JSON, backend vẫn validate lại.

### Preview

`POST /course-sections/roster-import/preview` không ghi database, trả:

- Dòng hợp lệ và user đã resolve.
- Code không tồn tại.
- User sai role hoặc inactive.
- Code trùng trong file.
- Số lượng sau import và lỗi capacity.

Preview trả `previewToken` có chữ ký, TTL ngắn và hash payload. Token ngăn
commit một nội dung khác với nội dung đã preview; không lưu file vào database.

### Commit

`POST /course-sections/:id/roster-import/commit` nhận `previewToken` và mode:

- `ADD`: chỉ thêm user hợp lệ.
- `REPLACE`: roster active cuối cùng đúng bằng file.

Nếu dữ liệu liên quan đã đổi sau preview, trả conflict và yêu cầu preview lại.
Không tạo Account, không đặt/reset password và không tự tạo User từ file roster.

## 7. Query models

Danh sách section trả summary để tránh N+1:

```json
{
  "id": "uuid",
  "code": "CT101-01",
  "name": "Lập trình căn bản - Nhóm 01",
  "course": { "code": "CT101", "name": "Lập trình căn bản" },
  "term": { "code": "2026-HK1", "name": "Học kỳ 1" },
  "lecturer": { "code": "GV001", "fullName": "Nguyễn Văn An" },
  "activeStudentCount": 42,
  "capacity": 60,
  "status": "ACTIVE",
  "syncStatus": "SYNCED"
}
```

Chi tiết section trả roster và timetable bằng endpoint riêng để bảng danh sách
không tải payload lớn.

## 8. Ports và services

```text
AcademicTermRepository
CourseRepository
CourseSectionRepository
EnrollmentRepository
UserDirectoryQuery          # port sang Organization
AcademicOutbox              # port ghi event trong transaction
CreateCourseSectionService
ManageRosterService
RosterImportService
AcademicQueryService
```

## 9. Acceptance criteria

- Không tạo section thiếu roster, lecturer hoặc student hợp lệ.
- Concurrent create cùng `(termId, code)` chỉ tạo một section.
- Roster import không tạo/reset account.
- Replace roster là atomic và không sửa snapshot của session cũ.
- Lecturer chỉ thấy section của mình.
- Attendance tắt không ngăn CRUD academic.
- Mỗi mutation cần sync có đúng một outbox event sau commit.
