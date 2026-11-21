# LMS Web Application

## 1. Mục tiêu trải nghiệm

LMS Web là công cụ vận hành học vụ, ưu tiên rõ ràng, nhanh và ít lỗi nhập liệu.
Giao diện cần có cảm giác hoàn chỉnh chứ không phải trang demo chứa nhiều form.

Nguyên tắc:

- Một màn hình có một mục tiêu chính và một primary action rõ ràng.
- Danh sách, filter, form và trạng thái dùng component nhất quán.
- Thông tin học vụ quan trọng luôn hiện code cạnh name.
- Mutation có feedback ngay; integration pending không bị hiển thị như lỗi lưu.
- Desktop là chính, tablet dùng được, mobile web chỉ hỗ trợ thao tác đọc/cơ bản.

## 2. Stack frontend

Tiếp tục React + Vite + TypeScript. Dùng các thư viện đã có ở admin dashboard để
giảm số cách giải quyết trong monorepo:

- `react-router-dom` cho routing/layout.
- `react-hook-form` cho form.
- `react-icons` cho icon thống nhất.
- `leaflet` + `react-leaflet` cho Building/session map.
- `xlsx` chỉ ở màn roster import.
- `@gps-attendance/shared` cho `ApiResponse`, error codes và HTTP primitives.

Không thêm state manager toàn cục. Auth dùng context; server state nằm trong
feature hooks/API cache theo pattern admin dashboard. Chỉ thêm query library nếu
cache hiện tại thực sự không đáp ứng sau khi triển khai các màn đầu.

## 3. Cấu trúc source

```text
client/lms-web/src/
├── app/
│   ├── router.tsx
│   ├── auth-provider.tsx
│   ├── protected-route.tsx
│   └── app-shell.tsx
├── api/
│   ├── http-client.ts
│   └── api-error.ts
├── components/
│   ├── layout/
│   ├── ui/
│   └── feedback/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── organization/
│   ├── academic/
│   ├── facilities/
│   ├── timetable/
│   ├── attendance/
│   ├── integration/
│   └── reporting/
├── theme/
│   ├── tokens.css
│   └── global.css
└── main.tsx
```

Mỗi feature có `api.ts`, `types.ts`, `hooks.ts`, `pages/` và `components/` khi
cần. Không tạo barrel sâu; page chỉ import public component của feature khác.
`App.tsx` hiện tại được thay bằng router/shell, không tiếp tục mở rộng.

## 4. Visual language

### Màu và typography

- Nền ứng dụng: xám xanh rất nhạt; content surface trắng.
- Primary: indigo/xanh đại học, dùng cho hành động và navigation active.
- Success: xanh lá; warning: amber; destructive: đỏ; pending: xanh lam nhạt.
- Text chính đủ tương phản; muted text không dùng màu quá nhạt.
- Font sans-serif hệ thống hoặc font hiện tại của sản phẩm, cỡ body 14–16px.

### Shape và spacing

- Grid spacing 4/8px.
- Radius vừa phải 8–12px; không biến mọi block thành card nổi.
- Shadow chỉ dùng cho dropdown/dialog; panel chính dùng border nhẹ.
- Table header sticky trong màn danh sách dài.

### Tokens

Tất cả màu, spacing, radius, typography và z-index nằm trong `theme/tokens.css`.
Không hardcode màu rải rác trong page. Dark mode nằm ngoài MVP.

## 5. App shell

Desktop:

```text
┌──────────── Sidebar 240px ────────────┬──────── Topbar ───────────────┐
│ Logo + tên LMS                       │ Breadcrumb     User menu      │
│ Tổng quan                            ├────────────────────────────────┤
│ Học vụ                               │ Page heading + primary action  │
│  ├ Học kỳ                            │ Filters / summary               │
│  ├ Môn học                           │                                │
│  ├ Lớp học phần                      │ Main content                    │
│  └ Thời khóa biểu                    │                                │
│ Cơ sở vật chất                       │                                │
│ Quản trị                             │                                │
│ Tích hợp (admin only)                │                                │
└───────────────────────────────────────┴────────────────────────────────┘
```

- Sidebar thu gọn thành drawer dưới 1024px.
- Topbar có breadcrumb, user name/role và logout.
- Content max width rộng cho table/calendar, hẹp hơn cho form.
- Navigation lấy role từ auth state và route guard vẫn kiểm phía client.

## 6. Route map

```text
/login
/
/units
/users
/academic-terms
/courses
/course-sections
/course-sections/:id
/course-sections/:id/roster
/course-sections/:id/timetable
/course-sections/:id/attendance
/facilities
/timetable
/integration
/profile
```

Section detail dùng một page shell với tab, không tạo bốn layout khác nhau.

## 7. Màn hình chính

### Login

- Brand panel ngắn, không có marketing dài.
- Username/password, show password, loading state, lỗi chung không lộ account.
- Enter submit; focus và autocomplete đúng chuẩn.
- Mobile student vẫn dùng native app; web login dành admin/lecturer.

### Dashboard

Admin thấy:

- Học kỳ hiện hành.
- Số lớp active, lecturer, student.
- Phiên hôm nay.
- Integration pending/failed.
- Shortcut: tạo lớp, thêm user, cấu hình Building.

Lecturer thấy lớp của mình, lịch hôm nay và nút tạo phiên. Không hiện card quản
trị rỗng hoặc disabled.

### Units và Users

- Unit dùng tree ở trái, detail/edit panel ở phải.
- Users dùng data table, filter role/unit/status và search.
- Create/edit mở drawer hoặc modal có chiều rộng ổn định.
- Password tạm chỉ hiển thị một lần sau khi tạo, có nút copy và cảnh báo.

### Academic terms và Courses

- List page đơn giản, status badge và filter active/status.
- Form tách riêng, không nhúng vào từng row table.
- Closed term có banner giải thích vì sao không thể sửa.

### Course sections

Danh sách hiển thị:

- Code + name.
- Course/term.
- Lecturer.
- Sĩ số dạng `42 / 60` hoặc `42 / Không giới hạn`.
- Status và sync status.
- Hành động xem chi tiết; không nhồi nhiều icon action vào row.

Wizard tạo section gồm ba bước:

1. Thông tin lớp: term, course, code, name, capacity.
2. Giảng viên.
3. Danh sách sinh viên: chọn trực tiếp hoặc import, review lỗi rồi tạo.

Không cho hoàn tất khi roster rỗng.

### Section detail

Header có code/name, lecturer, term, status và sync badge. Tabs:

- Tổng quan: course, capacity, lịch sắp tới.
- Sinh viên: roster table, add/drop/import.
- Thời khóa biểu: weekly list/calendar.
- Điểm danh: sessions và thống kê.

### Facilities

Layout master-detail:

```text
Campus list → Building list/detail
```

Building detail có map lớn, marker kéo được, input latitude/longitude và slider
hoặc numeric input bán kính. Bản đồ hiển thị vòng tròn radius cùng note:
“Một Building tương ứng một vùng GPS dùng chung cho toàn tòa.”

### Timetable

- Toggle tuần/danh sách.
- Filter term, section, lecturer và Building.
- Màu event theo course nhưng vẫn có text/legend, không dựa chỉ vào màu.
- Click event mở popover với code lớp, giờ, Building và action tạo phiên nếu có quyền.
- Conflict hiển thị inline gần field và chỉ rõ đối tượng bị trùng.

### Create attendance session

Form/drawer gồm:

1. Section và thời gian, prefill từ timetable occurrence.
2. Nguồn vị trí: Building / vị trí hiện tại / chọn bản đồ.
3. Map preview có marker và vòng radius.
4. Summary roster count và nút tạo phiên.

Nếu dùng Building, hiển thị tên tòa và cảnh báo anchor xấp xỉ. Nếu browser từ
chối location, Building/map vẫn dùng được. Submit thành công hiển thị pending
sync thay vì spinner chờ Attendance.

### Reporting

- Summary strip: tổng phiên, đúng giờ, trễ, vắng, có phép.
- Table sinh viên có progress/rate, sortable và searchable.
- Click row mở drawer lịch sử từng phiên.
- Badge rõ “Dữ liệu mẫu” khi provider mock.
- Không dùng pie chart cho mọi metric; table và số trực tiếp dễ so sánh hơn.

### Integration admin

- Health summary, số pending/failed và lần sync gần nhất.
- Event table: type, aggregate, attempts, error code, updated time.
- Detail drawer che/redact payload nhạy cảm.
- Retry chỉ enable cho failed/retryable event.
- Reconcile nằm trong secondary action có confirmation.

## 8. Component set

Shared UI tối thiểu:

```text
PageContainer, PageHeading, Breadcrumbs
Button, IconButton, Input, Select, Textarea
FormField, FieldError
DataTable, Pagination, FilterBar
StatusBadge, SyncStatusBadge
Dialog, Drawer, ConfirmDialog
Tabs, EmptyState, ErrorState, Skeleton
ToastRegion
MapPicker, RadiusPreview
```

Ưu tiên tái sử dụng semantics/pattern từ admin dashboard. Chỉ copy component
khi LMS cần ownership riêng; không import source trực tiếp giữa hai client.

## 9. API và state

- Mỗi feature có API functions typed, không gọi `fetch` trong page.
- Hooks sở hữu loading/error/reload và cache invalidation.
- Form giữ draft local; server response là nguồn sự thật sau save.
- 401 thử refresh đúng một lần rồi logout nếu vẫn lỗi.
- Error code map sang translation/key; không switch trên message.
- Mutation disable submit trong lúc gửi và chống double click.

## 10. Loading, empty và error states

Mỗi page phải có đủ:

- Initial skeleton giữ gần đúng layout.
- Empty state nói rõ chưa có gì và action tiếp theo nếu có quyền.
- Error state có request ID và nút retry.
- Stale content được giữ khi background reload lỗi, kèm cảnh báo nhỏ.
- Forbidden redirect về page phù hợp, không render trang trắng.

## 11. Accessibility và responsive

- Mọi input có label; lỗi liên kết bằng `aria-describedby`.
- Dialog trap focus và trả focus về trigger.
- Table action dùng accessible name.
- Status không truyền đạt chỉ bằng màu.
- Keyboard dùng được cho navigation, form, tabs và dialog.
- Map có input số thay thế thao tác kéo marker.
- Ở màn nhỏ, table quan trọng chuyển thành horizontal scroll; không ẩn cột code
  hoặc status tùy tiện.

## 12. Frontend acceptance criteria

- `App.tsx` không còn chứa routing, API và mọi page trong một component.
- Admin và lecturer thấy đúng navigation/quyền.
- Mọi list page có loading/empty/error/pagination.
- Wizard section không cho tạo roster rỗng.
- Building map hiển thị đúng một anchor và radius.
- Create session hiển thị rõ nguồn location và snapshot trước submit.
- Mock reporting được gắn badge, không bị hiểu là dữ liệu thật.
- Build production, typecheck và accessibility smoke test đạt.
