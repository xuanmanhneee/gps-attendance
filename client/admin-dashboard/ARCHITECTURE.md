# ARCHITECTURE — admin-dashboard

Tài liệu này mô tả **kiến trúc** của package `client/admin-dashboard`: thành phần nào nằm ở đâu,
mỗi thành phần làm gì, dữ liệu đi qua những tầng nào, và những điểm mạnh / điểm cần cải thiện của
thiết kế hiện tại.

Phạm vi:

- Chỉ nói về package này. Quy ước chung (response format, guard, module server) xem `docs/conventions/`;
  kiến trúc tổng của hệ thống xem `docs/architecture.md`.
- **Không** lặp lại cây thư mục chi tiết — cây thư mục thuộc `STRUCTURE.md` (package này chưa có).
  Ở đây chỉ có bảng "thành phần → vị trí → mục đích".
- Mọi đường dẫn trong tài liệu tính từ `client/admin-dashboard/` trừ khi ghi rõ.

Trạng thái tài liệu: viết ngày 14/10/2026, dựa trên code tại thời điểm đó (đối chiếu `PLAN.md` của
package — nơi ghi các quyết định gần nhất như wizard `/sessions/new`).

---

## 1. Tổng quan

| Hạng mục | Nội dung |
|---|---|
| Package | `@gps-attendance/admin-dashboard` (pnpm workspace, private) |
| Vai trò | Web dashboard cho hai vai trò `admin` và `organizer` của hệ thống điểm danh GPS |
| Người dùng | `admin`: quản lý đơn vị / tag (và user theo kế hoạch), xem toàn bộ phiên, lọc theo organizer. `organizer`: tạo phiên điểm danh, xem phiên của mình, xem chi tiết + participant |
| UI stack | React 19.1 + TypeScript ~6.0, Vite 8, `@vitejs/plugin-react` |
| Styling | Tailwind CSS 4 qua `@tailwindcss/vite`; design token khai báo trong `src/index.css` bằng `@theme` |
| Routing | `react-router-dom` 7 (`BrowserRouter` + `Routes`/`Route` lồng nhau) |
| Form | `react-hook-form` (trang tạo phiên dùng `Controller` + `useWatch` + `trigger`) |
| Thông báo | `react-toastify` (1 `ToastContainer` đặt ở `App.tsx`) |
| Bản đồ | `leaflet` 1.9 + `react-leaflet` 5 (chỉ dùng trong `SessionLocationMap`) |
| Icon | `react-icons` (Material `md`, `io5`, `ri`, `fa6`) |
| HTTP | `createHttpClient` từ `@gps-attendance/shared`; Vite alias `@gps-attendance/shared` → `packages/shared/src` (dùng source trực tiếp, không build package) |
| i18n | Tự viết trong `src/i18n`: 2 locale `vi`/`en`, mỗi dictionary 276 key; `TranslationKey` suy ra từ dictionary `vi` nên sai key bị bắt lúc compile |
| Test | `node --test --experimental-strip-types "src/**/*.test.ts"`: 13 file, 105 test case, 39 suite, không cần thư viện test nào thêm |
| Biến môi trường | `VITE_API_BASE_URL` (ví dụ: `http://localhost:3000`) — không có proxy dev, không có biến khác |
| Script | `dev`, `build` (`tsc -b && vite build`), `test`, `clean` |
| HTML shell | `index.html` — `lang="vi"`, title "GPS Attendance — Dashboard", favicon `/favicon.svg` |

Chạy từ **gốc repo** (không `cd`):

```powershell
pnpm --filter @gps-attendance/admin-dashboard dev    # người dùng tự chạy khi cần thử
pnpm --filter @gps-attendance/admin-dashboard build
pnpm --filter @gps-attendance/admin-dashboard test
```

Điểm cần biết trước khi đọc code:

- Không có state library (Redux/Zustand/TanStack Query…). Dữ liệu server được giữ bằng `useState`
  trong từng hook, kèm các guard chống race viết tay (xem mục 6).
- Không có `ErrorBoundary`, không dùng `React.lazy`/`Suspense`; mọi page nằm trong bundle chính
  (kể cả Leaflet). Xem mức P1 ở mục 8.
- Backend là nơi quyết định quyền thật; guard phía client chỉ để UX (xem mục 5).

## 2. Kiến trúc tầng và luồng dữ liệu

Provider tree (`src/App.tsx`):

```
<BrowserRouter>            // router ngoài cùng: mọi tầng dưới được dùng useNavigate/useLocation
  <LocaleProvider>         // locale (vi/en) + hàm t
    <ThemeProvider>        // mode light/dark/system → data-theme trên <html>
      <AuthProvider>       // user, isLoading, login, logout (KHÔNG dùng router)
        <ToastContainer />
        <AppRoutes />
```

`LocaleProvider` và `ThemeProvider` độc lập với auth; role hiển thị không có provider riêng mà suy ra
từ auth context qua `useRole()` (`src/hooks/useRole.ts`) — nhờ vậy không thể tồn tại "role giả" lưu
trong localStorage.

Luồng render và luồng import (một chiều, từ trên xuống):

```
AppRoutes                     routes/AppRoutes.tsx  + ProtectedRoute + RoleGuard
  └── DashboardLayout         components/layout/     sidebar + topbar + <main><Outlet/></main>
        └── pages/*           state cục bộ của trang, ghép hook + component + điều hướng
              ├── components/ui/*            UI kit thuần props (không gọi API, không biết domain)
              ├── components/<domain>/*      sessions/ tags/ units/ + SessionTable (root components/)
              ├── hooks/*                    state async + race guard
              │     └── api/*.api.ts         endpoint + validate id/name
              │           └── @gps-attendance/shared  createHttpClient(...)
              │                    └── fetch tới VITE_API_BASE_URL, token từ localStorage('token')
              └── utils/*, types/*, config/*, i18n/*   logic thuần, không React
```

| Tầng | Được phép import | Không được làm |
|---|---|---|
| `utils/`, `types/`, `config/` | type từ `@gps-attendance/shared`, `i18n/translation-keys`, `routes/paths` | import React/component/hook, gọi API |
| `api/` | `./http`, shared | import React, component |
| `hooks/` | `api/`, `types/`, `utils/`, `context/*-value` | render JSX, import `components/` |
| `components/ui/` | hook `useTranslation`, `hooks/useLocale` | gọi API, biết domain nghiệp vụ |
| `components/<domain>/` | `components/ui/`, `utils/`, `types/`, `config/` | tự gọi API trực tiếp (dữ liệu vào qua props/hook của page) |
| `pages/` | tất cả các tầng trên | — (đây là nơi duy nhất ghép mọi thứ) |

Quy ước "state injection" đáng chú ý: `UnitsPage` truyền `unitsState = useUnits()` xuống `UnitsPanel`,
`TagsPage` truyền `tagsState`/`assignmentState` xuống `TagsPanel`. Component domain không tự fetch —
đổi nguồn dữ liệu/ test component dễ hơn, và hook vẫn là nơi duy nhất chạm API.

## 3. Thành phần theo nhóm

`src/` hiện có 103 file `.ts`/`.tsx` (không tính test) + 13 file `*.test.ts` + 3 asset
(`assets/hero.png`, `assets/react.svg`, `assets/vite.svg`) + `index.css`. Bảng dưới đây là bản đồ
"thành phần → vị trí → mục đích"; cây thư mục chi tiết để trong `STRUCTURE.md`.

### 3.1 Khởi động, định tuyến, cấu hình

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Entry | `src/main.tsx` | `createRoot` + `StrictMode`, import `index.css` |
| Root component | `src/App.tsx` | Xếp provider: `BrowserRouter` → `LocaleProvider` → `ThemeProvider` → `AuthProvider`, kèm `ToastContainer` |
| Route table | `src/routes/AppRoutes.tsx` | Khai báo toàn bộ route, guard theo role, `LandingRedirect` cho `/`, catch-all `*` → `NotFoundPage` (nằm trong layout) |
| Route constants | `src/routes/paths.ts` | `ROUTE_PATHS` — nguồn duy nhất của chuỗi route (không hard-code rải rác) + `buildSessionDetailPath(id)` |
| Auth gate | `src/routes/ProtectedRoute.tsx` | `isLoading` → `LoadingState` toàn màn hình; chưa có user → `Navigate('/login')` |
| Role gate | `src/routes/RoleGuard.tsx` | Nhận `allowedRoles`; role không nằm trong danh sách → `Navigate(DEFAULT_ROUTE_BY_ROLE[role])` (hiện cả hai role đều về `/dashboard`) |
| Nav config | `src/config/navigation.ts` | `NAVIGATION_ITEMS` (id, `labelKey`, `descriptionKey`, `path`, `roles`), `getNavigationForRole`, `isNavigationItemActive`, `findNavigationItem`, `DEFAULT_ROUTE_BY_ROLE`, `NAVIGATION_GROUP_LABEL_KEYS`. `isKnownPath` / `isPathAllowedForRole` hiện **không ai dùng** (xem mục 8) |
| Session status config | `src/config/session-status.ts` | `SESSION_STATUS_ORDER` (open → pending → closed), `SESSION_STATUS_LABEL_KEYS`, `SESSION_STATUS_DOT_CLASS` (màu chỉ là lớp nhấn, nhãn chữ mới là nguồn thông tin) |
| Attendance status config | `src/config/attendance-status.ts` | Label key + tone class cho trạng thái participant (`present/absent/late/excused`) và `PARTICIPANT_ROLE_LABEL_KEYS` |
| Design token / CSS toàn cục | `src/index.css` | Token trong `@theme` (font, màu `oklch`, `--shadow-panel`) sinh utility `bg-surface`, `text-ink`…; dark theme ghi đè cùng bộ token trong `[data-theme='dark']`; `@layer base` cho `body`, `:focus-visible`, heading; fix `.leaflet-container img { max-width: none }` cho preflight Tailwind |
| HTML shell | `index.html` | `lang="vi"`, viewport, favicon `/favicon.svg`, title "GPS Attendance — Dashboard" |

Chi tiết route (đường dẫn → element → guard):

| Path (`ROUTE_PATHS`) | Element | Guard |
|---|---|---|
| `/login` | `LoginPage` | công khai (không nằm trong layout) |
| `/` | `LandingRedirect` | redirect `/dashboard` nếu đã login, ngược lại `/login` |
| `/dashboard` | `DashboardPage` → `AdminOverview` / `OrganizerOverview` | `ProtectedRoute` + layout |
| `/users`, `/units`, `/tags` | `UsersPage` (placeholder), `UnitsPage`, `TagsPage` | `RoleGuard ['admin']` |
| `/sessions`, `/attendance-records`, `/statistics` | `SessionsPage`, `AttendanceRecordsPage` (placeholder), `StatisticsPage` (placeholder) | `RoleGuard ['admin','organizer']` |
| `/sessions/new` | `SessionCreatePage` | `RoleGuard ['organizer']` |
| `/sessions/:id` | `SessionDetailPage` | `RoleGuard ['admin','organizer']` |
| `*` | `NotFoundPage` | trong layout |

Ghi chú: `/sessions/new` khai báo trước `/sessions/:id` (react-router 7 vẫn ưu tiên route khớp cụ thể
hơn nên thứ tự không phải điều kiện đúng — comment trong `AppRoutes.tsx` nói rõ ý này).

### 3.2 Layout (`src/components/layout/`)

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Khung dashboard | `components/layout/DashboardLayout.tsx` | Sidebar cố định + `Topbar` + `<main className="max-w-[1440px]">` chứa `Outlet`; giữ callback logout (`logout()` rồi `navigate('/login', { replace: true })`) và truyền `user`/`onLogout` xuống sidebar |
| Sidebar | `components/DashboardSidebar.tsx` | **Đặt ở `components/` gốc chứ không nằm trong `layout/`**: ghép `Brand` + `RoleStatus` + `SidebarNav` + `HelpCard` + profile (chữ cái đầu của `fullname`, tên role, nút logout); responsive `w-16` → `md:w-[220px]` → `lg:w-64` |
| Brand | `components/layout/Brand.tsx` | Logo + tên app (`app.brandPrimary` / `app.brandSecondary`) |
| Menu theo role | `components/layout/SidebarNav.tsx` | `getNavigationForRole(role)` → `NavLink`; `nav` có `aria-label`; nhãn nhóm lấy `NAVIGATION_GROUP_LABEL_KEYS[role]`; icon lấy từ `NAVIGATION_ICONS` |
| Icon menu | `components/layout/navigation-icons.ts` | Map `NavigationItemId` → `IconType`, tách khỏi config để config thuần dữ liệu |
| Khối vai trò | `components/layout/RoleStatus.tsx` | Hiển thị role read-only (`aria-live="polite"`), **không có dropdown đổi vai trò** |
| Thẻ trợ giúp | `components/layout/HelpCard.tsx` | Nội dung tĩnh lấy từ prototype, chỉ hiện từ breakpoint `md` |
| Topbar | `components/layout/Topbar.tsx` | Breadcrumb nhỏ (`findNavigationItem(pathname)` + `topbar.context.<role>`), ngày hiện tại format theo locale, `LocaleToggle` + `ThemeToggle` |
| Đổi ngôn ngữ | `components/layout/LocaleToggle.tsx` | `IconButton` đảo `vi` ⇄ `en` qua `useLocale` |
| Đổi theme | `components/layout/ThemeToggle.tsx` | `IconButton` xoay vòng `light → dark → system` qua `useTheme().cycleMode` |

### 3.3 UI kit (`src/components/ui/`)

Nhóm này là "hợp đồng hình thức" của dashboard: chỉ nhận props + `t`, không gọi API, không biết domain.

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Trạng thái dữ liệu | `components/ui/DataState.tsx` | `DataState` với 4 variant `loading/empty/error/unavailable` (`role="alert"` cho error, `role="status"` cho còn lại) + `onRetry`/`retryLabel`; export sẵn `LoadingState`, `EmptyState`, `ErrorState`, `UnavailableState` ("chưa có API" — cố ý hiện gạch + giải thích thay vì số liệu mock) |
| Dialog | `components/ui/Dialog.tsx` | `role="dialog"` + `aria-modal`, focus trap (Tab/Shift+Tab), `Escape`/backdrop đóng, focus trả về trigger khi unmount; prop `canClose` chặn đóng khi mutation đang chạy |
| Logic focus trap | `components/ui/dialog-focus.utils.ts` | `FOCUSABLE_SELECTOR` + `resolveTabTrapIndex` — logic thuần, tách khỏi component để test được bằng `node:test` |
| Khối nội dung | `components/ui/Panel.tsx` | `Panel` (card lớn) + `PanelHeader` (title/subtitle/action) |
| Tiêu đề trang | `components/ui/PageHeading.tsx` | `eyebrow` + `h1` + `description` + slot `action` |
| Link hành động | `components/ui/PanelActionLink.tsx` | Link "Xem tất cả →" ở góc phải `PanelHeader` |
| Nút chính | `components/ui/PrimaryButton.tsx` | Nút accent (`type`, `icon`, `onClick`, `className`); **chưa có prop `disabled`/variant** nên nhiều nơi phải tự viết `<button>` (xem mục 8) |
| Nút icon | `components/ui/IconButton.tsx` | Nút vuông có `aria-label` + `title`, dùng cho các toggle ở sidebar/topbar |
| Badge trạng thái phiên | `components/ui/StatusBadge.tsx` | Nhãn chữ + chấm màu theo `SESSION_STATUS_LABEL_KEYS` |
| Phân bố trạng thái | `components/ui/StatusDistribution.tsx` | Danh sách % theo `SESSION_STATUS_ORDER`; tổng bằng 0 → `EmptyState` |
| Thẻ số liệu | `components/ui/SummaryCard.tsx` | `value: number \| null` → hiện `—` khi chưa có nguồn dữ liệu; `tone` quyết định màu icon |
| Chỉ số chưa có API | `components/ui/UnavailableMetricsPanel.tsx` | Liệt kê metric chưa có backend, kèm `<span class="sr-only">` giải thích cho screen reader |

### 3.4 Component theo domain

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Bảng phiên | `components/SessionTable.tsx` | **Đặt ở `components/` gốc** (dùng chung cho `AdminOverview`, `OrganizerOverview`, `SessionsPage`): quyết định state hiển thị qua `resolveSessionListState`, sort `openAt` giảm dần, nút "Chi tiết" điều hướng `buildSessionDetailPath`; khi còn dữ liệu cũ mà reload lỗi thì giữ bảng + banner cảnh báo (`shouldShowSessionStaleError`) thay vì xoá dữ liệu đang xem |
| Map lỗi phiên | `components/sessions/session-errors.ts` | `sessionErrorKeyByCode` (common code + `AttendanceSessionErrorCode`) và fallback theo `SessionErrorContext` (`list/detail/create`); `logSessionError` chỉ ghi console, không render message kỹ thuật |
| Bản đồ chọn vị trí | `components/sessions/SessionLocationMap.tsx` | Leaflet + tile OSM: kéo marker đổi tâm, kéo điểm ở rìa vòng tròn đổi bán kính, `RecenterMap` bám toạ độ mới, marker vẽ bằng `divIcon` (không phụ thuộc file ảnh), vòng tròn giữ state nội bộ để phản hồi tức thì và chỉ ghi vào form ở `dragend` |
| Chỉ báo bước | `components/sessions/SessionStepIndicator.tsx` | Thuần hiển thị wizard 2 bước (`aria-current="step"`), page quyết định bước hiện tại |
| Panel tags | `components/tags/TagsPanel.tsx` | Thành phần cấp page cho `/tags`: danh sách tag, mở modal tạo/xoá, mở panel gán user; nhận `tagsState` + `assignmentState` qua props và báo thành công qua callback `onToastSuccess` |
| Modal tạo tag | `components/tags/TagFormModal.tsx` | Validate bằng `validateTagName` trước khi submit; chỉ được mount khi mở nên form luôn sạch, không cần reset bằng effect |
| Dialog xoá tag | `components/tags/TagDeleteDialog.tsx` | Xác nhận xoá; focus mặc định vào nút Huỷ để tránh xoá nhầm bằng Enter, chặn Escape/backdrop khi đang gọi DELETE |
| Panel gán user cho tag | `components/tags/TagUserAssignmentPanel.tsx` | Chọn user từ directory hoặc nhập user ID thủ công; khi directory lỗi thì hiện `ID {id}` thay vì bịa tên; disable toàn bộ control khi có mutation đang chạy |
| Map lỗi tag | `components/tags/tag-errors.ts` | `tagErrorKeyByCode` + fallback theo `TagErrorContext` (`list/create/delete/assignment/directory/refresh`) |
| Helper hiển thị assignment | `components/tags/tag-assignment.utils.ts` | `buildAssignedRows` / `buildAvailableUsers` — logic thuần, có test |
| Panel units | `components/units/UnitsPanel.tsx` | Thành phần cấp page cho `/units`: danh sách + cây đơn vị, tìm kiếm cây, modal tạo/sửa, toast thành công; tính `forbiddenParentIds` (chính nó + toàn bộ con cháu) để không tạo vòng lặp phân cấp |
| Modal unit | `components/units/UnitFormModal.tsx` | Form tạo/sửa (name + parent); đồng bộ state khi mở qua effect vì component được render thường trực và tự `return null` khi đóng |
| Node cây đơn vị | `components/units/UnitTreeNode.tsx` | Render đệ quy, `aria-expanded`, nhãn mở/đóng truyền từ ngoài vào (component không tự dịch) |
| View model units | `components/units/unit.view-model.ts` | Mapper thuần `UnitResponse`/`UnitTreeResponse` → view model để JSX không phụ thuộc shape backend khi API còn đổi |
| Helper cây đơn vị | `components/units/unit-tree.utils.ts` | `collectDescendantIds`, `findNodeById`, `filterTree` (giữ node cha khi con khớp keyword) |
| Map lỗi unit | `components/units/unit-errors.ts` | `unitErrorKeyByCode` cho `UnitErrorCode`, trả `null` khi không map được để caller tự quyết định fallback |

### 3.5 Pages (`src/pages/`)

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Cổng dashboard | `pages/DashboardPage.tsx` | Route `/dashboard`: `role === 'organizer'` → `OrganizerOverview`, còn lại → `AdminOverview`. Thân page chỉ 3 dòng logic |
| Tổng quan admin | `pages/overview/AdminOverview.tsx` | 4 `SummaryCard` (tổng/đang mở/chờ/đã đóng từ `GET /v0/attendance-sessions`), panel "phiên gần đây" (5 phiên) dùng `SessionTable`, `StatusDistribution`, và `UnavailableMetricsPanel` cho user/unit/tag (chưa có API) |
| Tổng quan organizer | `pages/overview/OrganizerOverview.tsx` | Cùng cấu trúc nhưng scope `created-by-me`, thêm chỉ số "phiên mở hôm nay" (`countSessionsOpenedOn`), CTA `PrimaryButton` sang `/sessions/new`, `UnavailableState` cho tỉ lệ điểm danh |
| Danh sách phiên | `pages/SessionsPage.tsx` | Hai view nội bộ: `AdminSessionsView` (toàn bộ phiên + dropdown lọc theo organizer, `enabled: false` khi lựa chọn không hợp lệ nên không gọi API) và `OrganizerSessionsView` (phiên của mình + nút tạo). Page chọn view theo `useRole()` |
| Tạo phiên (wizard) | `pages/SessionCreatePage.tsx` | File lớn nhất package (**748 dòng**): wizard 2 bước trên một `useForm`, validate theo bước bằng `trigger(DETAILS_STEP_FIELDS)`, kiểm tra liên field `closeAt > openAt`, chọn vị trí bằng map hoặc nhập toạ độ (`LocationMode`), lấy vị trí hiện tại bằng `navigator.geolocation`, submit gọi `attendanceSessionsApi.create` trực tiếp rồi `toast.success` + `navigate('/sessions')`. Helper nội bộ: `NumberInput` (giữ buffer text để gõ được dấu thập phân), `CoordinateNumberInput`, `CoordinateReadout` |
| Chi tiết phiên | `pages/SessionDetailPage.tsx` | Parse `:id` bằng `parseSessionId`, guard shape `isAttendanceSessionDetail`; phân biệt lỗi id sai (`errorKey = sessionDetail.invalidId`) với lỗi API; refresh danh sách participant riêng (`isRefreshing`/`hasRefreshError`) không phá dữ liệu đang xem; link Google Maps theo toạ độ; `backPath` phụ thuộc role (organizer → `/sessions`, admin → `/dashboard` vì admin không có mục menu phiên) |
| Đăng nhập | `pages/LoginPage.tsx` | `react-hook-form` + `toast`; map `AuthErrorCode` sang message tiếng Việt hard-code. Đây là page **lệch khỏi design system** (xem mức P1 ở mục 8) |
| Page giữ chỗ | `pages/PlaceholderPage.tsx` | Đọc `findNavigationItem(pathname)` để lấy tiêu đề/mô tả nên label chỉ khai báo một chỗ; nội dung là `DataState` variant `unavailable` ("sắp có") — không giả lập dữ liệu backend |
| Wrapper giữ chỗ | `pages/UsersPage.tsx`, `pages/AttendanceRecordsPage.tsx`, `pages/StatisticsPage.tsx` | Mỗi file 1 dòng `return <PlaceholderPage />`, chỉ để route + menu không trỏ vào chỗ chết |
| Nối Units | `pages/UnitsPage.tsx` | `useUnits()` → `<UnitsPanel unitsState={...} />` |
| Nối Tags | `pages/TagsPage.tsx` | `useTags()` + `useTagAssignment()` → `<TagsPanel ... onToastSuccess={(m) => toast.success(m)} />` (page là nơi duy nhất biết tới toast) |
| Trang thông báo | `pages/MessagePage.tsx` | Một thông báo (empty/error/unavailable) + một hành động thoát ra; tái sử dụng `DataState` |
| 404 | `pages/NotFoundPage.tsx` | `MessagePage` với nút "về dashboard" |

### 3.6 Hooks (`src/hooks/`)

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Xác thực | `hooks/useAuth.ts` | `useContext(AuthContext)`, throw nếu dùng ngoài `AuthProvider` |
| Vai trò | `hooks/useRole.ts` | `resolveUserRole(user?.role)` — read-only, không giữ state nên refresh không thể tạo role giả |
| i18n / locale / theme | `hooks/useTranslation.ts`, `hooks/useLocale.ts`, `hooks/useTheme.ts` | Context hook tương ứng, đều throw khi thiếu provider |
| Phiên điểm danh | `hooks/useAttendanceSessions.ts` | Hook phức tạp nhất: 3 scope `all` / `created-by-me` / `created-by`, option `enabled` (lọc chưa hợp lệ thì **không gọi API**, `isLoading` suy ra từ `enabled`), `createLoadTracker` chặn stale response, `scopeKeyRef` xoá dữ liệu khi đổi phạm vi, `parseAttendanceSessionList` kiểm shape trước khi ghi state. Có `createSession`/`isCreating` nhưng hiện **không nơi nào dùng** (xem mục 8) |
| Tags | `hooks/useTags.ts` | `reload` (tải đầu/tải tay: lỗi ⇒ danh sách rỗng + `error`) tách khỏi `refresh` (sau mutation: lỗi ⇒ giữ danh sách cũ + `refreshError`), mutation qua `runTagMutation` |
| Gán user cho tag | `hooks/useTagAssignment.ts` | `selectedTag`, `assignedUserIds`, `directory` + `directoryError`, `pendingUserIds`; race guard bằng `createRequestScope` (`isCurrent(token)` trước mọi commit), `normalizeDirectory` tự chuẩn hoá payload thừa field |
| Đơn vị | `hooks/useUnits.ts` | Danh sách và cây có `isLoading`/`error` **riêng** để UI không báo "thành công giả" khi một trong hai nguồn còn tải/lỗi; `createUnit`/`updateUnit` chỉ success khi response có `id` hợp lệ rồi reload cả list + tree |
| Directory organizer | `hooks/useOrganizers.ts` | `GET /v0/users` → `toOrganizerOptions` (chỉ `role === 'organizer'`, dedupe theo id); stale guard bằng `loadIdRef` |

### 3.7 API client (`src/api/`)

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| HTTP client | `api/http.ts` | `createHttpClient(VITE_API_BASE_URL, () => localStorage.getItem('token'))`; đọc token trực tiếp từ storage để `api/` không phụ thuộc vòng vào `AuthProvider` |
| Auth | `api/auth.api.ts` | `POST /v0/admin/auth/login` → `LoginResponse.accessToken` |
| Users | `api/users.api.ts` | `GET /v0/users/me` (khôi phục phiên), `GET /v0/users` (directory cho dropdown organizer + panel gán tag) |
| Attendance sessions | `api/attendance-sessions.api.ts` | `create`, `getAll`, `getCreatedByMe` (backend yêu cầu role organizer), `getCreatedBy(userId)` (backend yêu cầu role admin), `getDetail`; `assertSessionId` chặn id không hợp lệ trước khi ghép URL |
| Tags | `api/tags.api.ts` | `getAll`/`create`/`remove` + `getAssignedUserIds`/`assignUser`/`unassignUser`; validate name (`validateTagName`) và id; **không có update** vì backend chưa expose `PATCH /tags/:id` |
| Units | `api/units.api.ts` | `getAll`, `getTree`, `getById` (hiện chưa dùng), `create`, `update`. `update` dùng hàm `patchUnit` tự viết bằng `fetch` vì `httpClient` của shared chưa expose `patch` — có comment giải thích, và giữ nguyên shape `{ success, data }` + `ApiError` |

### 3.8 Types, utils, i18n, services, context

Types (`src/types/`):

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Vai trò dashboard | `types/user-role.ts` | `UserRole = 'admin' \| 'organizer'`, `DEFAULT_USER_ROLE = 'admin'` (lưới an toàn, backend đã chặn role khác ở login admin), `resolveUserRole` |
| Phiên điểm danh | `types/attendance-session.ts` | `CreateSessionFormData` (= `CreateAttendanceSessionRequest` của shared nên không thể lệch field), `parseSessionId`, và các **shape guard**: `isAttendanceSession`, `parseAttendanceSessionList` (bỏ item lệch + `console.warn`, chỉ trả `null` khi payload không phải mảng), `isAttendanceSessionDetail`, `isAttendanceParticipant` |
| Tag | `types/tag.ts` | `Tag`, `DirectoryUser`, `MAX_TAG_NAME_LENGTH = 100`, `validateTagName` (thuần), guard `isTag`/`isTagList`/`isUserIdList`/`isDirectoryUser`/`isDirectoryUserList`, `parseUserIdInput` |
| Locale | `types/locale.ts` | `SupportedLocale`, `DEFAULT_LOCALE = 'vi'`, `isSupportedLocale` |
| Theme | `types/theme.ts` | `ThemeMode` (light/dark/system), `ResolvedTheme`, `THEME_MODES`, `DEFAULT_THEME_MODE = 'light'`, `isThemeMode` |

Utils (`src/utils/`) — toàn bộ là logic thuần, không import React:

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Form tạo phiên | `utils/attendance-sessions/session-form.ts` | `createDefaultSessionFormValues`, `combineLocalDateTime`, `isCloseAfterOpen`, `parseParticipantCodes`, `buildCreateSessionRequest`, `resolveGeolocationErrorKey` + hằng số miền hợp lệ (lat/long/radius) |
| Bộ lọc phiên | `utils/attendance-sessions/session-filter.ts` | `resolveSessionListScope` (trả `null` khi lựa chọn sai ⇒ caller không gọi API), `isValidOrganizerUserId`, `isOrganizerUser`, `toOrganizerOptions`, `createLoadTracker` (chặn stale response không dùng state React) |
| Trạng thái danh sách phiên | `utils/attendance-sessions/session-list.ts` | `toError`, `applySessionCreated` (upsert lên đầu), `resolveSessionListState` (ưu tiên dữ liệu đã có), `shouldShowSessionStaleError` |
| Danh sách tag | `utils/tags/tag-list.ts` | `applyTagCreated`/`applyTagDeleted` bất biến và `runTagMutation` tách "lỗi mutation" khỏi "lỗi refresh" |
| Pending assignment | `utils/tags/tag-pending.ts` | `withPendingUser` (Set theo userId ⇒ nhiều row pending đồng thời), `canStartAssignmentMutation` (single-flight có chủ đích) |
| Race guard chung | `utils/request-scope.ts` | `createRequestScope`: `begin(key)` / `isCurrent(token)` / `invalidate()` |
| Tổng hợp số liệu | `utils/session-summary.ts` | `countSessionsByStatus`, `countSessionsOpenedOn`, `sortSessionsByOpenAtDesc` (không mutate mảng gốc) |
| Lời chào | `utils/greeting.ts` | `buildGreeting` theo giờ trong ngày; tên người dùng không bị dịch |

i18n (`src/i18n/`):

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Bản đồ dictionary | `i18n/index.ts` | `dictionaries: Record<SupportedLocale, Dictionary>` (thêm locale mới là lỗi compile nếu thiếu file) + `LOCALE_TAGS` (`vi-VN`, `en-US`) cho `Intl`/`toLocaleString` |
| Key + nội suy | `i18n/translation-keys.ts` | `TranslationKey = keyof typeof vi`, `Translator`, `TranslationParams`, `interpolate` (thay `{token}`, không dùng `eval`/template literal) |
| Dictionary | `i18n/translations/vi.ts`, `i18n/translations/en.ts` | 276 key mỗi file; `vi` là nguồn định nghĩa kiểu |

Services & Context:

| Thành phần | Vị trí | Mục đích |
|---|---|---|
| Token | `services/token.service.ts` | `get/set/remove` token trong `localStorage` key `token` — cùng key mà `api/http.ts` đọc |
| Tuỳ chọn hiển thị | `services/preference.service.ts` | Lưu theme/locale (`gps-attendance.theme`, `gps-attendance.locale`); giá trị đọc từ storage luôn được validate lại, sai thì về mặc định |
| Auth context | `context/auth-context.tsx` + `context/auth-context-value.ts` | Provider giữ `user`/`isLoading`/`login`/`logout`, khôi phục phiên bằng `usersApi.getMe()` khi có token, xoá token khi `getMe` lỗi; file `*-value.ts` chứa `createContext` + type để provider chỉ export component (tương thích `react-refresh/only-export-components`) |
| Locale context | `context/locale-context.tsx` + `*-value.ts` | Đọc locale đã lưu ngay lần render đầu (không nhấp nháy ngôn ngữ), tạo `t` bằng `useMemo`, set `document.documentElement.lang` |
| Theme context | `context/theme-context.tsx` + `*-value.ts` | `mode` + `resolvedTheme` (theo dõi `prefers-color-scheme` khi mode là `system`), `cycleMode`, set `data-theme` trên `<html>` |

## 4. Các luồng nghiệp vụ chính

### 4.1 Khôi phục phiên và đăng nhập

```
mount → AuthProvider.loadUser()
  token không có        → isLoading=false, user=null → ProtectedRoute đẩy về /login
  token có, getMe OK    → user (UserProfileResponse) → vào /dashboard
  token có, getMe lỗi   → tokenService.remove() + user=null → về /login

/login → LoginPage.handleLogin(data)
  authApi.login → POST /v0/admin/auth/login → tokenService.set(accessToken)
  → usersApi.getMe() lấy profile → navigate('/dashboard', { replace: true })
  lỗi ApiError → toast theo AuthErrorCode, ở lại trang login
```

Logout không gọi backend: `logout()` xoá token + `setUser(null)`, `DashboardLayout` điều hướng về
`/login`.

### 4.2 Xem danh sách phiên

- **organizer** (`SessionsPage.OrganizerSessionsView`, `OrganizerOverview`): `useAttendanceSessions({ scope: 'created-by-me' })`
  → `GET /v0/attendance-sessions/created-by-me`.
- **admin** (`SessionsPage.AdminSessionsView`): mặc định `scope: 'all'` → `GET /v0/attendance-sessions`;
  chọn một organizer → `resolveSessionListScope` → `scope: 'created-by'` → `GET .../created-by?userId=...`.
  Lựa chọn sai → `scopeSelection === null` → `enabled: false` (không gọi API) + `ErrorState`
  "organizer không hợp lệ".

Hiển thị trong `SessionTable`: `resolveSessionListState` chọn `loading`/`error`/`empty`/`ready`; nếu đã
có dữ liệu thì reload lỗi **không** xoá bảng mà chỉ thêm banner `sessions.staleDataWarning` + nút thử
lại (`shouldShowSessionStaleError`).

### 4.3 Tạo phiên (wizard 2 bước, chỉ organizer)

```
/sessions/new (RoleGuard ['organizer'])
  bước 1 (DETAILS_STEP_INDEX): title, vị trí, bán kính, thời gian
    - chọn vị trí: LocationMode 'map' (SessionLocationMap) | 'manual' (nhập toạ độ)
    - "Lấy vị trí hiện tại": navigator.geolocation.getCurrentPosition → ghi lat/long vào form;
      lỗi → toast qua resolveGeolocationErrorKey
    - bước 1 chưa có toạ độ ⇒ KHÔNG render map (không thể tạo phiên với vị trí sai)
  "Tiếp tục": trigger(DETAILS_STEP_FIELDS) + validateTimeRange (closeAt > openAt)
  bước 2 (PARTICIPANTS_STEP_INDEX): participantCodesText → parseParticipantCodes
  submit: buildCreateSessionRequest(values) → attendanceSessionsApi.create
    OK + isAttendanceSession(response) → toast.success + navigate('/sessions')
    lỗi → toast.error(resolveSessionErrorKey(error, 'create'))
```

`isSubmitting` chặn double submit; state bước giữ bằng `useState` (không đưa lên URL — back/refresh của
trình duyệt quay về bước 1).

### 4.4 Chi tiết phiên (`/sessions/:id`)

```
parseSessionId(:id) → null ⇒ errorKey = 'sessionDetail.invalidId' (không gọi API)
                   → id    ⇒ getDetail(id) → isAttendanceSessionDetail guard → render
lỗi API ⇒ errorKey = resolveSessionErrorKey(error, 'detail'), chi tiết kỹ thuật chỉ vào console
"Làm mới participant": getDetail lại → chỉ nhận nếu id khớp phiên hiện tại (chống ghi đè sai phiên)
backPath: organizer → /sessions | admin → /dashboard
```

### 4.5 Tags và gán user (chỉ admin, `/tags`)

```
TagsPage: useTags() + useTagAssignment() → TagsPanel (state nhận qua props)

Tạo tag:  TagFormModal (validateTagName) → createTag(name)
            → runTagMutation(mutation, applyResult, refresh)
            → POST /tags thành công ⇒ cập nhật list ngay + refresh; lỗi refresh hiển thị riêng
Xoá tag:  TagDeleteDialog (focus nút Huỷ) → deleteTag(id) → DELETE /tags/:id + refresh
Gán user: mở panel cho tag ⇒ useTagAssignment.openFor(tag)
            → scope.begin(tag.id) → GET /tags/:tagId/users (+ directory GET /v0/users)
            → assign/unassign: POST|DELETE /tags/:tagId/users/:userId, pending theo userId,
              single-flight (disable toàn bộ control khi còn mutation), sau đó refresh assignment
            → đổi tag/đóng panel: scope.invalidate() ⇒ mọi response cũ bị bỏ
```

Khi directory lỗi: panel vẫn dùng được bằng cách nhập user ID thủ công và hiển thị `ID {id}` cho user
không tra được tên — không bịa tên, không chặn nghiệp vụ.

### 4.6 Đơn vị (chỉ admin, `/units`)

```
UnitsPage: useUnits() → UnitsPanel
  load song song: GET /units (list) + GET /units/tree (cây) — loading/error riêng
  tạo/sửa: UnitFormModal → createUnit/updateUnit
     update đi qua PATCH tự viết trong api/units.api.ts
     forbiddenParentIds = chính nó + toàn bộ con cháu (chống tạo chu trình)
     thành công ⇒ toast + reload cả list lẫn tree
```

## 5. Phân quyền

Ba lớp, theo thứ tự từ "quyết định thật" tới "chỉ để UX":

1. **Backend (nguồn quyết định thật)** — mọi endpoint tự kiểm tra role; `api/*.api.ts` ghi rõ điều này
   trong comment (`created-by-me` yêu cầu `organizer`, `created-by` yêu cầu `admin`, tạo phiên chỉ `organizer`).
2. **`ProtectedRoute`** — đã đăng nhập hay chưa; chưa có user → `/login`.
3. **`RoleGuard`** — `allowedRoles`; role không hợp lệ → `DEFAULT_ROUTE_BY_ROLE[role]`. Nhờ vậy URL
   luôn khớp quyền thật kể cả khi vào bằng deep link hoặc F5, không hiện màn hình rỗng/403 khó hiểu.

Role hiển thị (`useRole`, `RoleStatus`) là **read-only**, suy trực tiếp từ `auth-context` — không có
state riêng, không lưu localStorage, nên không thể tồn tại "role giả". `SidebarNav` dùng
`getNavigationForRole(role)` để render menu.

Đối chiếu menu và route hiện tại:

| Path | Menu (`NAVIGATION_ITEMS[].roles`) | Route (`RoleGuard`) | Hệ quả |
|---|---|---|---|
| `/dashboard` | `admin`, `organizer` | chỉ `ProtectedRoute` | khớp |
| `/users` | `admin` | `['admin']` | khớp |
| `/units` | `admin` | `['admin']` | khớp |
| `/tags` | `admin` | `['admin']` | khớp |
| `/sessions` | **`organizer`** | `['admin','organizer']` | admin vào được bằng URL nhưng **không có mục menu** ⇒ `AdminSessionsView` (bộ lọc theo organizer) không thể mở từ UI |
| `/attendance-records` | **`organizer`** | `['admin','organizer']` | admin vào được bằng URL nhưng không có mục menu |
| `/statistics` | **`organizer`** | `['admin','organizer']` | như trên |
| `/sessions/new` | không có mục menu (đi từ CTA "Tạo phiên") | `['organizer']` | khớp |
| `/sessions/:id` | không có mục menu (đi từ bảng phiên) | `['admin','organizer']` | khớp |

Hai nguồn quyền này (`NAVIGATION_ITEMS[].roles` và `RoleGuard allowedRoles`) là hai khai báo độc lập,
nên có thể lệch nhau — comment trong `config/navigation.ts` ("menu và route không thể lệch nhau") hiện
không còn đúng. Chi tiết và đề xuất ở mục 8 (P1).

## 6. Các mẫu thiết kế đáng học

### 6.1 Logic thuần tách khỏi React

Mọi quy tắc nghiệp vụ phức tạp nằm trong `utils/` hoặc file `*.utils.ts`, không import React, nên test
được bằng `node:test` + `--experimental-strip-types` (không cần jsdom, không cần thư viện test).
13 file test / 105 test case hiện có phủ: form tạo phiên, bộ lọc phiên, trạng thái danh sách, tag,
pending assignment, request scope, focus trap, shape guard của type, config trạng thái.

Ví dụ điển hình: `resolveTabTrapIndex` (focus trap) và `resolveSessionListState` (chọn state hiển thị)
đều là hàm thuần — component chỉ gọi, không tự suy luận.

### 6.2 Lỗi API đi qua `ApiError.code` → `TranslationKey`

`session-errors.ts`, `tag-errors.ts`, `unit-errors.ts` map **error code** (không dựa vào chuỗi message)
sang translation key, kèm fallback theo ngữ cảnh (`list/create/delete/...`). Message kỹ thuật của
backend và `Error.message` không bao giờ được render ra UI, chỉ vào console qua `log*Error`.

Đánh đổi đã chấp nhận: khi backend thêm code mới, cần cập nhật map — nếu quên, UI rơi về message
fallback chung (vẫn an toàn, không lộ chi tiết kỹ thuật).

### 6.3 Chống "thành công giả"

- Shape guard (`isAttendanceSession`, `isAttendanceSessionDetail`, `isTag`, `isUserIdList`,
  `isDirectoryUserList`) chạy **trước khi** ghi state; payload lạ ⇒ throw ⇒ UI hiện lỗi, không hiện
  danh sách rỗng như thành công.
- `parseAttendanceSessionList` bỏ item lệch shape (một bản ghi lỗi không làm mất cả danh sách) và
  `console.warn` số lượng bỏ qua.
- `DataState` có variant riêng `unavailable` + `UnavailableMetricsPanel` cho chỉ số chưa có API: thà
  hiện gạch và giải thích còn hơn mock số liệu.
- `SummaryCard` nhận `value: number | null` để buộc page phải quyết định "chưa có dữ liệu" thay vì
  truyền `0`.

### 6.4 Giữ dữ liệu cũ thay vì xoá khi lỗi

`SessionTable` dùng `resolveSessionListState` + `shouldShowSessionStaleError`: còn dữ liệu thì vẫn hiện
bảng và thêm banner lỗi + nút thử lại. `useTags.refresh` giữ danh sách và tách `refreshError` khỏi
`error` của lần tải đầu. `SessionDetailPage` refresh participant theo cách không phá dữ liệu đang xem.

### 6.5 Race guard viết tay, không phụ thuộc thứ tự render

| Cơ chế | Dùng ở đâu | Chống điều gì |
|---|---|---|
| `createLoadTracker` | `useAttendanceSessions` | response của organizer cũ ghi đè dữ liệu organizer mới; request cũ tắt loading của request mới |
| `scopeKeyRef` | `useAttendanceSessions` | đổi phạm vi thì xoá dữ liệu phạm vi cũ ngay, lỗi không bị nhìn nhầm là dữ liệu của phạm vi khác |
| `createRequestScope` | `useTagAssignment` | đổi tag/đóng panel: mọi commit phải qua `isCurrent(token)` |
| `loadIdRef` | `useOrganizers` | dropdown organizer hiện danh sách của lần chọn trước |
| `pendingUserIds` + `canStartAssignmentMutation` | tag assignment | double-submit và hai refresh chồng nhau |

### 6.6 Design token, dark mode và a11y

- Một nguồn màu duy nhất ở `index.css` (`@theme` + `[data-theme='dark']` ghi đè cùng tên token), nên
  dark mode không phải sửa từng component.
- Trạng thái luôn có nhãn chữ (`StatusBadge`, `ATTENDANCE_STATUS_*`), màu chỉ là lớp nhấn.
- `role="alert"` / `role="status"`, `aria-label`, `aria-current`, `aria-expanded`, `aria-live`,
  `sr-only` được dùng đúng chỗ; `:focus-visible` toàn cục trong `index.css`.
- `PrimaryButton` / `IconButton` tách khỏi `<button>` tự viết để các trạng thái focus/hover nhất quán.

### 6.7 State injection vào component domain

`UnitsPage` và `TagsPage` lấy state từ hook rồi truyền xuống panel (`unitsState`, `tagsState`,
`assignmentState`). Component không tự gọi API, không cần provider, dễ đổi nguồn dữ liệu và dễ test
bằng cách truyền state giả. `onToastSuccess` cũng là callback từ page, nên component không phụ thuộc
`react-toastify`.

## 7. Đánh giá thiết kế — điểm mạnh

1. **Ranh giới tầng rõ và nhất quán.** Luồng phụ thuộc một chiều `pages → components/hooks → api → shared`
   (mục 2) được tuân thủ trên toàn package: không page nào import chéo page khác ngoài `MessagePage`
   (một component trình bày thuần), không `api/` nào import React, không component nào tự gọi API.
2. **Logic nghiệp vụ tách khỏi React.** Nhờ `utils/**` và `*.utils.ts` thuần, 105 test case chạy bằng
   `node:test` trong ~0,4 giây, không cần jsdom/jest/vitest. Đây là lựa chọn rất hợp đồ án: chi phí thấp,
   phản hồi nhanh, ép logic phải "thuần".
3. **i18n chặt ở mức kiểu.** `TranslationKey = keyof typeof vi` khiến mọi `t('...')` sai key bị lỗi
   compile; `Record<SupportedLocale, Dictionary>` bắt `en` phải đủ key (hiện 276/276). `interpolate`
   thay `{token}` thủ công nên không có rủi ro thực thi biểu thức từ chuỗi dịch.
4. **Triết lý "không hiển thị thành công giả".** Shape guard trước khi ghi state, `DataState` bốn variant,
   `UnavailableMetricsPanel` cho chỉ số chưa có API, `SummaryCard.value: number | null` — người dùng
   không thể bị đánh lừa bởi mock/ước lượng.
5. **Giữ dữ liệu cũ khi lỗi.** Banner stale + retry trong `SessionTable`, `refreshError` tách khỏi `error`
   trong `useTags`, refresh participant không phá dữ liệu trong `SessionDetailPage`.
6. **Race condition được xử lý có chủ đích và có "biên bản".** `createLoadTracker`, `createRequestScope`,
   `pendingUserIds`, `scopeKeyRef` đều có comment giải thích tình huống thật (`createLoadTracker` còn có
   test trong `session-filter.test.ts`).
7. **A11y được coi trọng hơn mức thường thấy ở đồ án.** Focus trap + trả focus về trigger trong `Dialog`,
   focus mặc định vào nút Huỷ của dialog xoá, `role="alert"/"status"`, `aria-live`, `aria-current`,
   `aria-expanded`, `:focus-visible` toàn cục, và trạng thái luôn có nhãn chữ (không phân biệt chỉ bằng màu).
8. **Design system tối giản nhưng thật.** Token trong `@theme` + ghi đè trong `[data-theme='dark']` cho
   phép dark mode không phải sửa component; UI kit nhỏ (12 file) nhưng phủ đúng nhu cầu (state, panel,
   dialog, badge, số liệu).
9. **Type dùng chung với backend, không định nghĩa lại.** Response/request import từ `@gps-attendance/shared`
   (alias Vite trỏ vào source), error code dùng enum của shared — giảm mạnh khả năng lệch contract.
10. **Comment giải thích "vì sao", không chỉ "cái gì".** Ví dụ: `NumberInput` giữ buffer text để gõ được
    `21.`; form chỉ nhận bán kính ở `dragend` để marker không giật; vì sao `eslint-disable
    react-hooks/set-state-in-effect` là hợp lý ở chỗ đó; vì sao `patchUnit` tự viết `fetch`.

## 8. Điểm cần cải thiện

### P1 — nên xử lý sớm (ảnh hưởng hành vi/khả năng bảo trì)

**P1.1 `pages/SessionCreatePage.tsx` quá lớn (748 dòng, file lớn nhất package).**

- Trong một file đang có: 3 helper số (`NumberInput`, `CoordinateNumberInput`, `CoordinateReadout`),
  class string input, validate 2 bước, geolocation, JSX của cả 2 bước.
- Hệ quả: sửa một bước phải mở cả file; `NumberInput` — thứ có lý do kỹ thuật riêng (buffer text cho số
  thập phân) — bị chôn trong page nên khó dùng lại/test.
- Đề xuất: tách `components/sessions/SessionDetailsStep.tsx`, `SessionParticipantsStep.tsx`, và
  `components/ui/NumberInput.tsx` (hoặc `components/sessions/CoordinateFields.tsx`); số test cần thêm
  vẫn nằm ở tầng thuần (`session-form.ts`) nên không phải đổi chiến lược test.
- Lưu ý: file này cũng là nơi duy nhất còn hard-code vài chuỗi CSS màu (`hover:bg-[oklch(45%_0.17_220)]`)
  trong khi phần còn lại dùng token; khi tách file có thể thay bằng token tương ứng.

**P1.2 Hai nguồn quyền có thể lệch nhau: menu (`NAVIGATION_ITEMS[].roles`) vs route (`RoleGuard`).**

Bằng chứng (đã kiểm tra bằng tìm kiếm trong `src/`):

- `config/navigation.ts` khai `/sessions`, `/attendance-records`, `/statistics` là `['organizer']`, trong khi
  `AppRoutes.tsx` cho cả `admin` và `organizer` vào ba route này.
- Hệ quả 1: `SessionsPage.AdminSessionsView` (bộ lọc theo organizer) **không thể mở từ menu** vì admin
  không có mục "Phiên điểm danh"; muốn dùng phải gõ URL `/sessions`.
- Hệ quả 2: `/attendance-records` và `/statistics` hiện `PlaceholderPage` cho admin qua URL, nhưng admin
  không biết là có trang đó.
- Hệ quả 3: `isPathAllowedForRole` và `isKnownPath` trong `config/navigation.ts` **không có nơi nào dùng**
  (dead code) trong khi chúng chính là thứ sẽ gom hai nguồn quyền về một chỗ.
- Comment trong `config/navigation.ts` ("`path` đồng thời là route được phép truy cập, nên menu và route
  không thể lệch nhau") đã không còn đúng ⇒ dễ khiến người sau tin sai.
- Đề xuất (theo hướng nhỏ → lớn): (a) sửa `NAVIGATION_ITEMS[].roles` cho đúng ý định sản phẩm rồi để
  route lấy từ config; (b) hoặc gom về một nguồn: tạo map `path → allowedRoles` và cho `AppRoutes` +
  `SidebarNav` cùng đọc nó, xoá helper đang chết. Nên chọn (a) nếu muốn giữ thay đổi nhỏ.

**P1.3 `pages/LoginPage.tsx` lệch khỏi design system và còn code chết.**

- Hard-code màu/khung ngoài token: `bg-black`, `bg-gray-800`, `bg-green-600`, `text-[#ddd]`,
  `shadow-slate-500` — không dùng `bg-surface`/`text-ink`/`accent-strong` như phần còn lại, nên login
  không đổi theo theme và trông như một app khác.
- Chuỗi tiếng Việt hard-code (`'Sai username hoặc password'`, `'Đăng nhập thành công!'`,
  `'Đang đăng nhập...'`, label `Username`/`Password`, `Or`) thay vì đi qua `t()` ⇒ trang login không
  dịch được dù đã có `en.ts`.
- Nút Google là **control chết**: có `<img src="/google-icon.png">` nhưng không có `onClick`, không có
  handler, không có i18n/aria-label ⇒ người dùng bấm không có gì xảy ra.
- Không dùng `PageHeading`/`Panel`/`PrimaryButton` như các page khác.
- Đề xuất: đưa page về đúng hệ thống (token + `t()` + UI kit), xoá nút Google nếu chưa có luồng OAuth
  (kể cả `public/google-icon.png`), và chuyển map `AuthErrorCode → message` vào i18n key như
  `session-errors.ts`/`tag-errors.ts` đang làm.

**P1.4 Không có `ErrorBoundary` và không code-split.**

- Tìm trong `src/` không có `ErrorBoundary`/`componentDidCatch` (0 kết quả) và không có
  `React.lazy`/`Suspense` (0 kết quả) ⇒ một lỗi render ở bất kỳ page nào làm trắng toàn app, và
  **Leaflet + react-leaflet** (`SessionLocationMap`, dùng ở đúng một page) nằm trong bundle chính.
- Đề xuất tối thiểu: thêm một `ErrorBoundary` bọc `<Outlet />` trong `DashboardLayout` (kèm nút "Tải
  lại"), và `React.lazy` cho `SessionCreatePage` — vì route này đã có `RoleGuard ['organizer']` nên
  admin không bao giờ tải map, tách ra là lợi rõ ràng và chỉ tốn một `Suspense` với `LoadingState`.
- Lưu ý: sau khi tách lazy, kiểm tra lại `build` để chắc chunk Leaflet không lọt vào entry.

### P2 — nên làm khi có thời gian (chất lượng code)

**P2.1 Bốn hook lặp lại cùng một khuôn load/error/reload/race-guard.**

`useAttendanceSessions`, `useTags`, `useUnits`, `useOrganizers` đều tự viết: state `isLoading`/`error`,
`reload` trong `useCallback`, effect gọi lần đầu kèm `eslint-disable`, guard bỏ response cũ (mỗi hook
một kiểu: `createLoadTracker`, `loadIdRef`, `scopeKeyRef`, `createRequestScope`).

- Đề xuất: một hook chung dạng `useResource(fetcher, { enabled })` trả `{ data, isLoading, error, reload }`
  để phần guard/lifecycle chỉ viết một lần; các hook trên chỉ còn khai báo fetcher + logic riêng
  (scope, refresh sau mutation).
- Cân nhắc khác: TanStack Query giải quyết đúng lớp việc này (cache, dedupe, retry, stale) nhưng là
  một dependency mới và làm thay đổi cách test/logic hiện tại. Nếu mục tiêu của đồ án là học cách tự
  xử lý race condition thì **giữ cách tự viết và gom vào `useResource`** là lựa chọn hợp lý hơn.

**P2.2 Vị trí file và các module gần trùng nhau.**

- `components/SessionTable.tsx` và `components/DashboardSidebar.tsx` nằm ở `components/` gốc trong khi
  mọi component khác đã được xếp theo tính năng (`layout/`, `sessions/`, `tags/`, `units/`, `ui/`).
  Không phải lỗi, nhưng khi tìm file theo tính năng thì dễ bỏ sót hai file này.
- Ba module map lỗi (`sessions/session-errors.ts`, `tags/tag-errors.ts`, `units/unit-errors.ts`) có cấu
  trúc gần giống nhau (map code → key + fallback + log). Có thể gom khung chung
  (`createErrorResolver`/`resolveApiErrorKey`) rồi mỗi domain chỉ truyền map + fallback — nhưng chỉ nên
  làm khi có domain thứ tư, vì ba bản hiện tại ngắn và dễ đọc.

**P2.3 Test chỉ phủ tầng logic thuần (0 component test).**

- 105 test case đều ở `utils/`, `types/`, `config/`, `*.utils.ts` — không có test cho component/page.
  Đây là **đánh đổi có chủ đích** (không cần jsdom) và phù hợp đồ án, nhưng nghĩa là các quy tắc chỉ tồn
  tại trong JSX (disable control khi pending, thứ tự focus, banner stale, wizard step) không được
  kiểm chứng tự động.
- Đề xuất nếu muốn tăng độ phủ mà không thêm nặng: đẩy thêm quyết định hiển thị xuống `utils`
  (ví dụ hàm quyết định "control nào bị disable", "có hiện banner hay không") và test hàm đó; giữ quyết
  định dùng jsdom/react-testing-library cho giai đoạn sau.

### P3 — dọn dẹp nhỏ (mỗi việc vài phút, không đổi hành vi)

| Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|
| `createSession`/`isCreating` không dùng | `hooks/useAttendanceSessions.ts` (khai báo + return) nhưng `SessionCreatePage` gọi thẳng `attendanceSessionsApi.create` | Xoá khỏi hook để hook chỉ còn một việc là đọc danh sách |
| i18n key chết `sessions.form.close` | chỉ còn `i18n/translations/vi.ts`, `en.ts` | Xoá ở cả hai dictionary (di sản của modal tạo phiên cũ) |
| Comment đã cũ nói về "modal" | `types/attendance-session.ts` (khối `CreateSessionFormData`) trong khi UI hiện là trang `/sessions/new` | Sửa comment |
| `unitsApi.getById` không dùng | chỉ định nghĩa trong `api/units.api.ts` | Xoá, hoặc giữ nếu sắp có màn hình chi tiết đơn vị |
| `PrimaryButton` thiếu `disabled`/trạng thái chờ | `components/ui/PrimaryButton.tsx` không có prop `disabled` ⇒ `SessionCreatePage`, `DataState`, `SessionTable`, `SessionDetailPage` phải tự viết `<button>` và lặp class | Thêm `disabled` (+ `isLoading` nếu cần) rồi thay các `<button>` trùng kiểu |
| `README.md` vẫn là template Vite | nội dung "React + TypeScript + Vite" | Viết lại: mục đích, biến môi trường, script, liên kết `ARCHITECTURE.md`/`PLAN.md` |
| Không có script `lint` | `eslint.config.js` đã có (tseslint + react-hooks + react-refresh) nhưng `package.json` chỉ có `dev/build/test/clean` | Thêm `"lint": "eslint ."` (và `"typecheck": "tsc -b"` nếu muốn tách khỏi `build`) |
| Dependency có thể thừa | không có `import` nào của `xlsx` trong `src/`; `axios` chỉ dùng gián tiếp qua shared | Rà lại `package.json`, xoá nếu thật sự không dùng để giảm bề mặt cài đặt |
| Asset không ai import | `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg` | Xoá cùng lúc với việc dọn asset thừa |
| `DEFAULT_USER_ROLE = 'admin'` là lưới an toàn khá rộng | `types/user-role.ts`: role lạ (vd `participant`) bị quy về `admin` ⇒ menu admin hiện ra nhưng API sẽ 403 | Cân nhắc trạng thái "role không hỗ trợ" (màn hình thông báo) thay vì mặc định admin |
| Prefix API không nhất quán | `/v0/auth`, `/v0/users`, `/v0/attendance-sessions` có prefix; `/tags`, `/units` không có (đã ghi comment trong `api/*.api.ts`) | Là ràng buộc backend — chỉ thống nhất khi backend cho phép; hiện giữ comment là đủ |
| A11y/perf nhỏ | map Leaflet không thao tác được bằng bàn phím (đã có fallback nhập toạ độ); `SessionTable` sort và `StatusDistribution` tính % lại mỗi render | Ghi nhận, chưa cần sửa: dữ liệu nhỏ, fallback đã có; nếu danh sách lớn thì `useMemo` |

## 9. Ghi chú và việc đề xuất tiếp theo

### 9.1 Tài liệu

- **Chưa có `STRUCTURE.md`** cho package này (theo ghi chú trong `PLAN.md`). Khi tạo, chỉ nên chứa cây
  thư mục + quy ước đặt tên file, và trỏ sang `ARCHITECTURE.md` cho phần giải thích — tránh hai tài liệu
  mô tả trùng nhau rồi lệch nhau.
- Tên file `docs/conventions/nameing.md` bị sai chính tả (đúng ra là `naming.md`), trong khi `AGENTS.md`
  lại trỏ tới `docs/conventions/naming.md`: nên đổi tên file và cập nhật lại mục lục trong `AGENTS.md`.
- Khi thực hiện các việc ở mục 8, ghi lại quyết định vào `PLAN.md` của package theo thói quen đang dùng
  (việc đã xong / quyết định / còn lại).

### 9.2 Thứ tự đề xuất cho các việc nhỏ, ít rủi ro

1. Sửa `NAVIGATION_ITEMS[].roles` + comment sai trong `config/navigation.ts` (P1.2) — chỉ sửa dữ liệu
   config, không đụng cấu trúc.
2. Xoá dead code: `createSession`/`isCreating`, key `sessions.form.close`, `unitsApi.getById`, asset
   thừa, comment "modal" (P3).
3. Thêm script `lint`/`typecheck` rồi chạy một lần để biết nợ lint thật (P3).
4. Đưa `LoginPage` về design system (P1.3) — có thể làm từng bước: token trước, i18n sau, xoá nút Google cuối.
5. Tách `SessionCreatePage` và `React.lazy` (P1.1, P1.4) — việc lớn hơn, nên làm sau khi đã có `lint` và
   test đang xanh để dễ phát hiện hồi quy.

### 9.3 Khi nào phải cập nhật tài liệu này

- Thêm/đổi route hoặc guard → cập nhật mục 3.1 (bảng route) và mục 5 (đối chiếu menu/route).
- Thêm hook hoặc đổi chiến lược fetch (kể cả nếu chuyển sang `useResource`/TanStack Query) → mục 2, 3.6, 6.5.
- Thêm domain mới (users CRUD, attendance records, statistics) → mục 3.4/3.5 + mục 4.
- Đổi chiến lược test → mục 6.1, 7, 8.

### 9.4 Phần nghiệp vụ còn thiếu (đang là placeholder)

`/users` (quản lý người dùng), `/attendance-records` (bản ghi điểm danh) và `/statistics` (thống kê) hiện
chỉ render `PlaceholderPage`. Cả ba đều đang chờ API phía `server/attendance`; khi làm, giữ nguyên khuôn
đã có: `api/*.api.ts` + hook có race guard + component domain nhận state qua props + Panel/`DataState`.

### 9.5 Tài liệu liên quan

- `docs/architecture.md` — kiến trúc tổng của hệ thống (mobile, admin, server, shared).
- `docs/conventions/api-response.md` — format `ApiResponse<T>` và error code (lý do các map lỗi ở mục 6.2).
- `docs/conventions/auth-guards.md` — `JwtAuthGuard`, phân biệt `User` và `Account` (lý do luôn phải kiểm
  tra quyền ở backend — mục 5).
- `docs/conventions/module-structure.md` — cấu trúc module NestJS ở server (phía nhận của mọi request ở mục 3.7).
- `client/admin-dashboard/PLAN.md` — nhật ký việc đã làm của package.
