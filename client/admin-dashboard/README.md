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
| HTTP | Axios không dùng trực tiếp trên page — `createHttpClient` từ shared (fetch) |
| Deploy | Dockerfile → nginx:alpine, cổng host **8080** |

`xlsx` có trong `package.json` nhưng **chưa dùng** trong `src/` (chưa xuất Excel).

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
│   ├── routes/
│   └── services/
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
- `logout`: xóa token local, **không** gọi API logout (backend cũng chưa có)
- Refresh token từ login **không được lưu** trên dashboard

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
- Nút tạo phiên → `CreateSessionModal`
- `useAttendanceSessions`: load / tạo / đóng / xóa
- `SessionTable` nhận callbacks
- Logout: `logout()` rồi `/login`

Lecturer: API `GET /v0/attendance-sessions` chỉ trả phiên mình tạo. Admin: tất cả.

### `pages/SessionDetailPage.tsx`

- `GET /v0/attendance-sessions/:id/detail`
- Thông tin phiên (GPS, bán kính, thời gian, trạng thái)
- Bảng **sinh viên** (status present/absent, khoảng cách, thiết bị) — phân trang 10
- Bảng **attempts** (kết quả, reasons tiếng Việt) — phân trang 10
- Refresh danh sách, đóng phiên, xóa phiên (`ConfirmModal`)
- Skeleton / empty / error (`ErrorFallback`)

---

## 6. Từng component

| File | Việc |
|---|---|
| `CreateSessionModal.tsx` | Form tạo phiên: title, lat/lng (GPS trình duyệt), radius, ngày giờ local, mã SV cách nhau dấu phẩy → `codeFilter.addCodes`. TODO unit/tag trên form. |
| `SessionTable.tsx` | Nhóm phiên theo ngày, badge pending/open/closed, phân trang 6, click vào chi tiết, confirm đóng/xóa |
| `DashboardSidebar.tsx` | Logo, nav “Phiên điểm danh” (active). Mục Thống kê / Sinh viên / Cài đặt **chỉ UI, chưa có route**. Avatar + fullname + role, nút đăng xuất |
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

- `getMe()` → `GET /users/me`

### `attendance-sessions.api.ts`

| Hàm | HTTP |
|---|---|
| `create` | `POST /v0/attendance-sessions` |
| `getAll` | `GET /v0/attendance-sessions` |
| `getDetail(id)` | `GET /v0/attendance-sessions/:id/detail` |
| `getByUser(userId)` | `GET /v0/attendance-sessions/by-user/:userId` — **khai báo nhưng chưa gọi từ UI** |
| `close(id)` | `POST /v0/attendance-sessions/:id/close` |
| `remove(id)` | `DELETE /v0/attendance-sessions/:id` |

### `hooks/useAttendanceSessions.ts`

Load danh sách lúc mount; `createSession` prepend list; `closeSession` set status closed; `deleteSession` lọc khỏi list; `reload`.

---

## 8. Env, Vite, Docker

`.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:3000
```

Dev: Vite **http://localhost:5173** (`pnpm dev:admin`).

`vite.config.ts`: plugin React + Tailwind.

`nginx.conf` (production image):

- SPA `try_files` → `index.html`
- Gzip, header X-Frame-Options / XSS / nosniff
- Cache static 1 năm
- Proxy `/v0/` và `/health` → `http://backend:3000`
- Listen 80 trong container; Compose map **8080:80**

`Dockerfile`: build shared + dashboard, copy `dist` vào nginx.

---

## 9. Scripts

Từ root: `pnpm dev:admin`, `pnpm build:admin`, `pnpm clean:admin`.

Trong package: `pnpm dev`, `pnpm build` (`tsc -b && vite build`), `pnpm clean`.

---

## 10. Hạn chế thuộc dashboard

- Không lưu / không gọi refresh token
- Sidebar: Thống kê, Sinh viên, Cài đặt chưa có trang
- `getByUser` API client chưa gắn UI
- `xlsx` chưa xuất file
- `routes/ProtectedRoute.tsx` không dùng
- Logout chỉ xóa localStorage
