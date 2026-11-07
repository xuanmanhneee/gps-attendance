# PLAN — admin-dashboard

Ghi lại việc đã xong / còn lại / quyết định quan trọng để task sau đọc lại thay vì dựng lại từ đầu.

## Thay modal "Tạo phiên" bằng trang `/sessions/new` (wizard 2 bước)

**Trạng thái:** đã xong (build + test pass: `pnpm --filter @gps-attendance/admin-dashboard build|test`).

### Đã xong

1. Thêm dependency: `leaflet@^1.9.4`, `react-leaflet@^5.0.0` (deps) và `@types/leaflet` (dev).
2. `routes/paths.ts`: thêm `attendanceSessionCreate: '/sessions/new'`.
3. `routes/AppRoutes.tsx`: route `/sessions/new` nằm **trước** `/sessions/:id`, guard `RoleGuard ['organizer']`.
4. `pages/SessionCreatePage.tsx` (mới): wizard 2 bước, một `useForm` duy nhất.
5. `components/sessions/SessionLocationMap.tsx` (mới): Leaflet + OSM tiles, kéo marker đổi tâm,
   kéo điểm ở rìa vòng tròn đổi bán kính.
6. `components/sessions/SessionStepIndicator.tsx` (mới): chỉ báo tiến trình (thuần hiển thị).
7. `pages/SessionsPage.tsx`, `pages/overview/OrganizerOverview.tsx`: nút tạo phiên điều hướng sang
   `/sessions/new` (bỏ state `isCreateModalOpen`).
8. Xoá `CreateSessionModal.tsx`, `CreateSessionModalActions.tsx`, `CreateSessionModalHeader.tsx`
   (đã kiểm tra không còn tham chiếu nào).
9. `index.css`: `.leaflet-container img { max-width: none }` để preflight của Tailwind không làm
   co tile bản đồ.
10. i18n: thêm key cho wizard vào cả `vi.ts` và `en.ts`.

### Quyết định quan trọng

- **Vẫn nhập mã người tham gia bằng tay ở bước 2**: `participantCriteria` của DTO backend là bắt buộc và
  `isValidUserFilterCriteria` cần ≥1 điều kiện, nếu không sẽ 400 `INVALID_CRITERIA`.
- **Dùng lại util thuần** (`utils/attendance-sessions/session-form.ts`) thay vì tự parse:
  `createDefaultSessionFormValues`, `combineLocalDateTime`, `isCloseAfterOpen`, `parseParticipantCodes`,
  `buildCreateSessionRequest`, `resolveGeolocationErrorKey`; lỗi API qua
  `resolveSessionErrorKey`/`logSessionError` với context `'create'`.
- **Validate**: rule per-field gắn qua `register`/`Controller.rules` để `trigger()` chạy được theo
  từng bước; ràng buộc liên field `closeAt > openAt` kiểm tra thủ công trong `validateTimeRange`.
- **Vòng tròn/marker trên map**: vòng tròn dùng state nội bộ để phản hồi tức thì khi kéo, form chỉ
  nhận giá trị ở `dragend` (ghi form giữa lúc kéo sẽ làm marker giật).
- **Input số thập phân**: input số dùng buffer text (`NumberInput`) thay vì bind thẳng giá trị đã
  parse, nếu không sẽ không gõ được dấu chấm (`21.` → `21` rồi bị ghi đè).
- **Bước wizard lưu bằng `useState`**, không đưa lên URL: back/refresh của trình duyệt sẽ quay về
  bước 1.
- **Chế độ nhập vị trí**: map/geolocation là mặc định, có toggle sang "Nhập toạ độ"; khi chưa có toạ
  độ thì không render bản đồ (tránh tạo phiên với vị trí sai).
- **Menu và vai trò**: admin có menu `/sessions` (`AdminSessionsView` đã có); `/statistics` vẫn là placeholder nên giữ menu chỉ cho organizer.

### Còn lại / đề xuất

- Bước 2 nên thay bằng UI chọn lớp/đơn vị khi backend có filter tương ứng.
- Chưa có `STRUCTURE.md` cho package này; nếu tạo thì cập nhật theo cấu trúc mới
  (`components/sessions/*`, `pages/SessionCreatePage.tsx`).

## Đã xong P04-07 — Dọn điều hướng, Login, ErrorBoundary, lazy load

**Trạng thái:** đã xong (build + test pass: `pnpm --filter @gps-attendance/admin-dashboard build|test|typecheck`).

### Các thẻ đã hoàn thành (.1 đến .7)

1. **P04-07.1 & P04-07.1b — Đồng bộ menu `/sessions` cho admin và dọn helper quyền:**
   - Thêm `admin` vào roles của mục `/sessions` trong `NAVIGATION_ITEMS` (`src/config/navigation.ts`), giúp admin mở `AdminSessionsView` trực tiếp từ sidebar menu.
   - Xoá hai hàm dead code `isKnownPath` và `isPathAllowedForRole` trong `navigation.ts`.
   - Cập nhật comment giải thích rõ vai trò bảo vệ route của `RoleGuard`.
   - Chuẩn hoá `sessions.page.description` trong `vi.ts` và `en.ts` thành câu trung tính cho cả `admin` và `organizer`.
2. **P04-07.2 — Xoá nút Google:**
   - Xoá nút Google không hoạt động và file asset thừa liên quan (`public/google-icon.png`).
3. **P04-07.3 — LoginPage dùng token và i18n:**
   - Thay thế toàn bộ style và màu hard-code bằng token màu chuẩn hệ thống (`@theme`: `bg-surface`, `text-ink`, `accent-strong`, border, input, panel) theo theme xanh đồng bộ với dashboard.
   - Toàn bộ chuỗi giao diện và thông báo lỗi API đi qua `t()`, map lỗi `AuthErrorCode` thành key i18n trong `vi.ts` và `en.ts`.
   - Bỏ nhận diện trường ĐH Đà Lạt (DLU), chuyển tiêu đề và nhận diện về hệ thống điểm danh GPS chung.
4. **P04-07.4 — Khôi phục `ErrorBoundary` cho dashboard:**
   - Thêm `ErrorBoundary` bọc `<Outlet />` trong `DashboardLayout.tsx` với prop `resetKey={location.pathname}` để tự động khôi phục giao diện khi chuyển trang.
   - Fallback dùng `DataState` lỗi với một nút tải lại trang (`common.reloadPage`: "Tải lại").
5. **P04-07.5 & P04-07.5b — Lazy load `SessionCreatePage` và `SessionEditPage`:**
   - Sử dụng `React.lazy` và `Suspense` với `LoadingState` cho cả hai trang có dùng Leaflet bản đồ (`SessionCreatePage.tsx` và `SessionEditPage.tsx`).
   - Tách thành công chunk Leaflet / `SessionLocationPickerModal` (~163 kB) ra khỏi entry chính, giảm kích thước `index` từ ~631 kB xuống ~459 kB.
6. **P04-07.6 — Dọn dead code trong hook, api và comment:**
   - Xoá `createSession`, `isCreating`, `createInFlightRef` và các import thừa trong `useAttendanceSessions.ts`.
   - Xoá `unitsApi.getById` trong `src/api/units.api.ts`.
   - Sửa các comment cũ nhắc về "modal" trong `types/attendance-session.ts` và `utils/attendance-sessions/session-form.ts`.
   - Xác nhận giữ `sessions.form.close` vì đang được dùng làm `aria-label` cho nút đóng modal chọn vị trí (`SessionLocationPickerModal.tsx:208`).
7. **P04-07.7 — Thêm script `typecheck` và `lint`:**
   - Thêm `"typecheck": "tsc -b"` và `"lint": "eslint ."` vào `client/admin-dashboard/package.json`.
   - Chạy kiểm tra ghi nhận typecheck pass, lint phát hiện 6 vấn đề sẵn có (4 lỗi, 2 cảnh báo) ở file của người khác.

### Quyết định đã chốt

- **Bỏ Google**: xoá nút Google không có chức năng vì hệ thống chưa hỗ trợ đăng nhập OAuth.
- **Bỏ nhận diện trường (DLU)**: chuyển toàn bộ tên và nhãn sang hệ thống điểm danh GPS trung tính.
- **Giao diện đồng bộ xanh**: đưa Login về palette token xanh khớp với dashboard, hỗ trợ light/dark theme tự nhiên.
- **ErrorBoundary theo URL**: reset lỗi tự động khi URL thay đổi (`resetKey={location.pathname}`), chỉ bọc `<Outlet />` để giữ nguyên khung sidebar và topbar khi có sự cố trang con.
- **Code-split Leaflet**: lazy load cả trang tạo lẫn trang sửa phiên để không tải bundle bản đồ nặng khi người dùng chỉ thao tác các trang nghiệp vụ khác.

### Phát hiện thêm

1. `applySessionCreated` trong `utils/attendance-sessions/session-list.ts` thành hàm chết (không còn caller trong `src/` sau khi `createSession` bị xoá khỏi `useAttendanceSessions`), nhưng test trong `session-list.test.ts` vẫn còn đầy đủ. Tạm giữ lại và ghi nhận.
2. `SessionLocationMap.tsx` và `SessionFormLocationCard.tsx` là file chết (không có nơi nào trong `src/` import sau các đợt refactor trước). Cần dọn ở task dọn dẹp sau.
3. Nhãn `sessions.form.close` ("Đóng") đang dùng làm `aria-label` nút đóng bản đồ trong `SessionLocationPickerModal.tsx:208`. Cần cân nhắc đổi nhãn thành "Đóng bản đồ" (`sessions.locationPicker.close` hoặc tương đương) cho rõ nghĩa hơn.
4. `PrimaryButton` có độ tương phản thấp ở dark mode khi đặt trên một số nền surface.
5. 6 vấn đề lint sẵn có ở code của người khác (`ParticipantCriteriaEditor.tsx`, `SessionLocationMap.tsx`, `UnitFormModal.tsx`, `useUnits.ts`).
