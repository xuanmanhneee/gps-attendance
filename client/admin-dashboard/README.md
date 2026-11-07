# Admin Dashboard — `@gps-attendance/admin-dashboard`

Web SPA cho **lecturer** và **admin**: đăng nhập JWT, quản lý phiên điểm danh, xem chi tiết sinh viên và lượt thử.

Tổng quan: [../../README.md](../../README.md). API: [../../server/attendance/README.md](../../server/attendance/README.md). Contract: `@gps-attendance/shared`.

---

## 1. Phạm vi package

Mọi file trong `client/admin-dashboard/` thuộc dashboard này: `src/` (UI + API client), Vite, Tailwind, Dockerfile, nginx.

**Không** chứa API Nest hay app Expo. Sinh viên không dùng dashboard này (`POST /v0/admin/auth/login` từ chối role student).

---

## 2. Công nghệ

| Hạng mục | Công nghệ |
|---|---|
| UI | React 19, Vite 8, TypeScript |
| Routing | react-router-dom 7 |
| Style | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Form / UX | react-hook-form, react-toastify, react-icons |
| HTTP | API calls dùng `createHttpClient` từ shared (fetch); Axios hiện là dependency nhưng không phải transport chính |
| Deploy | Dockerfile → nginx:alpine, cổng host **8080** |

`xlsx` được dùng trong `CourseSectionsPage` để đọc/ghi mẫu Excel/CSV danh mục học phần và roster sinh viên. Chi tiết phiên có export CSV, không phải file Excel `.xlsx`.

---

## 3. Cấu trúc thư mục

```text
client/admin-dashboard/
├── Dockerfile
├── nginx.conf
├── index.html
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .env.example                 # VITE_API_BASE_URL
├── src/
│   ├── main.tsx                 # AuthProvider + App
│   ├── App.tsx                  # Routes + Toast + ProtectedRoute nội bộ
│   ├── index.css / App.css
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── context/
│   └── services/              # token service
└── README.md
```

---

## 4. Entry, auth, routing

### `main.tsx`

Bọc `AuthProvider` quanh `App`. CSS: `index.css` (Tailwind).

### `context/auth-context.tsx`

- State: `user: UserProfileDto | null`, `isLoading`
- Khởi động: nếu có token → `GET /users/me`; lỗi thì xóa token
- `login`: `POST /v0/admin/auth/login` → lưu **accessToken** vào localStorage → `getMe`
- `logout`: dashboard hiện xóa token phía client; chưa gọi endpoint logout/revoke phía backend
- Login response có refresh token nhưng dashboard chỉ lưu access token; chưa có refresh tự động

### `hooks/useAuth.ts`

Đọc `AuthContext`; throw nếu ngoài provider.

### `services/token.service.ts`

Key `localStorage`: `token` — get / set / remove.

### `App.tsx` — route

| Path | Bảo vệ | Màn hình |
|---|---|---|
| `/login` | không | `LoginPage` |
| `/dashboard` | có | `DashboardPage` |
| `/sessions/:id` | có | `SessionDetailPage` |
| `/locations` | có | `LocationRegistryPage` |
| `/course-sections` | có | `CourseSectionsPage` |
| `/` và `*` | — | redirect `/login` |

Protected route **inline trong `App.tsx`**: loading → “Đang kiểm tra đăng nhập…”; chưa user → `/login`.

### `routes/ProtectedRoute.tsx`

Bản dùng `Outlet`. **Hiện không được import** — `App.tsx` tự bọc children.

Toast: `ToastContainer` góc trên phải, 3s.

---

## 5. Từng trang

### `pages/LoginPage.tsx`

- Form `react-hook-form` (`username`, `password`)
- Hiện/ẩn mật khẩu
- Gọi `useAuth().login` → toast thành công → `/dashboard`
- Map `ApiError`: `INVALID_CREDENTIALS`, `ACCOUNT_NOT_LINKED`, `ROLE_NOT_ALLOWED` (SV không vào được)

### `pages/DashboardPage.tsx`

- Sidebar + tiêu đề “Danh sách phiên điểm danh”
- Cards thống kê chuyên cần và danh sách sinh viên có attendance risk (khi có dữ liệu)
- Nút tạo phiên → `CreateSessionModal` chọn lớp/ca học, xem roster active, kiểm tra Building/radius/GPS accuracy và thời gian
- `useAttendanceSessions`: load / tạo / đóng / xóa
- `SessionTable` nhận callbacks
- Logout: `logout()` rồi `/login`

Lecturer: API `GET /v0/attendance-sessions` chỉ trả phiên mình tạo. Admin: tất cả.

### `pages/SessionDetailPage.tsx`

- `GET /v0/attendance-sessions/:id/detail`
- Thông tin phiên (GPS, bán kính, thời gian, trạng thái)
- Bảng **sinh viên** (status present/absent, khoảng cách, thiết bị) — phân trang 10
- Bảng **attempts** (kết quả, lý do) — phân trang
- Export danh sách/chi tiết ra CSV theo chức năng trên trang
- Review/approve/reject attempts, audit/history, thao tác thiết bị tùy quyền/endpoint
- Đóng, hủy hoặc xóa phiên tùy trạng thái và quyền
- Skeleton / empty / error (`ErrorFallback`)

---

## 6. Từng component

| File | Việc |
|---|---|
| `CreateSessionModal.tsx` | Chọn lớp/ca học và xem roster active; thời gian phiên; location/radius/accuracy lấy từ Building đã hiệu chuẩn |
| `SessionTable.tsx` | Nhóm phiên theo ngày, trạng thái, phân trang, xem chi tiết và xác nhận thao tác |
| `DashboardSidebar.tsx` | Điều hướng phiên, Location Registry và (admin) lớp học phần; hiển thị user/role và logout |
| `ConfirmModal.tsx` | Dialog xác nhận đóng/xóa |
| `Pagination.tsx` | Phân trang dùng chung |
| `EmptyState.tsx` | Không có dữ liệu |
| `LoadingSkeleton.tsx` | Đang tải |
| `ErrorFallback.tsx` | Lỗi tải + thử lại |

---

## 7. API client (`src/api`)

### `http.ts`

```ts
createHttpClient(import.meta.env.VITE_API_BASE_URL, () => localStorage.getItem('token'))
```

Mọi request gắn Bearer nếu có token. Unwrap `ApiResponse` phía shared client.

### `auth.api.ts`

- `login(LoginRequest)` → `POST /v0/admin/auth/login`

### `users.api.ts`

- `getMe()` → `GET /v0/users/me`

### `attendance-sessions.api.ts`

| Hàm | HTTP |
|---|---|
| `create` | `POST /v0/attendance-sessions` |
| `getAll` | `GET /v0/attendance-sessions` |
| `getDetail(id)` | `GET /v0/attendance-sessions/:id/detail` |
| `getTeachingSections`, `getSectionRoster` | Lớp được phân công và roster active |
| `getAnalytics` | `GET /v0/attendance-sessions/analytics` |
| `reviewAttempt` | `POST /v0/attendance-sessions/:id/attempts/:attemptId/review` |
| `verifyLecturerLocation` | Gửi GPS evidence của giảng viên |
| `updateDeviceTrust` | Admin trust/block thiết bị |
| `close(id)` | `POST /v0/attendance-sessions/:id/close` |
| `cancel(id)` | `PATCH /v0/attendance-sessions/:id/cancel` |
| `remove(id)` | `DELETE /v0/attendance-sessions/:id` |

### `course-sections.api.ts`

- Liệt kê teaching sections và roster.
- Admin tạo lớp học phần; backend tạo hoặc dùng lại môn theo course code và học kỳ theo năm học + semester.
- Admin quản lý thời khóa biểu từng lớp: thêm/sửa/xóa lịch lặp theo Thứ hoặc một buổi theo ngày cụ thể, giờ và phòng; ngày cụ thể phải nằm trong học kỳ, ca trùng giờ không được lưu và ca đã gắn với session không thể xóa.
- Nhập danh mục bằng CSV/XLSX: `ma_hoc_phan` bắt buộc; `ten_hoc_phan`, `tin_chi` tùy chọn; tối đa 1.000 dòng/5 MB. Thiếu tên thì dùng mã làm tên tạm.
- Nhập sinh viên bằng CSV/XLSX (tối đa 2.000 dòng/5 MB) hỗ trợ các cột mã số SV, User (tùy chọn), họ lót, tên, ngày sinh, giới tính và lớp. Khi ghi danh, hồ sơ sinh viên được cập nhật gồm họ tên, ngày sinh, giới tính, lớp và email theo dạng `<mã_sinh_viên>@dlu.edu.vn`. Mỗi lớp nhận tối đa 300 sinh viên; admin có thể nâng sức chứa lớp đang chọn lên 300 trước khi ghi danh lại các dòng vượt giới hạn. Tài khoản mới dùng MSSV làm tên đăng nhập nếu file không có User; mật khẩu tài khoản mới và tài khoản đã có trong danh sách chi tiết được đồng bộ về MSSV. Mật khẩu được hash, không hiển thị hoặc trả về. Báo cáo dòng thiếu dữ liệu, User trùng, mã không phải student, mã trùng file và vượt sức chứa.

### `location-registry.api.ts`

- Liệt kê buildings/rooms.
- Admin cập nhật tọa độ, geofence radius và GPS accuracy threshold trước khi đánh dấu Building đã xác minh; tạo phòng/liên kết phòng với Building.

Phiên được tạo từ `courseSectionId` sẽ dùng snapshot vị trí Building đã xác minh và thêm attendance records `absent` cho enrollment active tại thời điểm tạo.

### `hooks/useAttendanceSessions.ts`

Load danh sách lúc mount; `createSession` prepend list; `closeSession` set status closed; `deleteSession` lọc khỏi list; `reload`.

---

## 8. Env, Vite, Docker

`.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:3001
```

Local dev: Vite **http://localhost:5173** (`pnpm dev:admin`) gọi backend NestJS tại `http://127.0.0.1:3001`. Nếu dùng ngrok, đặt `VITE_API_BASE_URL` thành URL HTTPS của tunnel rồi khởi động lại Vite để nạp biến môi trường mới.

`vite.config.ts`: plugin React + Tailwind.

`nginx.conf` (production image):

- SPA `try_files` → `index.html`
- Gzip, header X-Frame-Options / XSS / nosniff
- Cache static 1 năm
- Proxy `/v0/` → `http://backend:3000/v0/`
- Có proxy `/health` legacy, nhưng backend hiện cung cấp health tại `/v0/health`; Compose/Nginx health paths cần được đồng bộ nếu gọi trực tiếp `/health`
- Listen 80 trong container; Compose map **8080:80**

`Dockerfile`: build shared + dashboard, copy `dist` vào nginx.

---

## 9. Scripts

Từ root: `pnpm dev:admin`, `pnpm build:admin`, `pnpm clean:admin`.

Trong package: `pnpm dev`, `pnpm build` (`tsc -b && vite build`), `pnpm clean`.

---

## 10. Auth, quyền và giới hạn

- `ProtectedRoute` trong `App.tsx` xác thực đăng nhập; role guard API ở backend mới là quyền kiểm soát cuối cùng. Course-section actions chỉ admin; lecturer chỉ xem/sửa các nội dung được endpoint cho phép.
- Dashboard chưa lưu/refresh access token tự động; token hết hạn thì đăng nhập lại.
- Logout hiện xóa token local, chưa gọi endpoint logout/revoke dù backend có endpoint.
- Course-section UI hỗ trợ nhập mã môn, tạo lớp và quản lý roster; chưa phải bộ CRUD đầy đủ cho mọi dữ liệu học vụ như chỉnh sửa kỳ học hoặc timetable.
- Không suy luận API/functionality chỉ từ dependency hoặc file component chưa được route; đối chiếu `App.tsx` và `src/api/`.
