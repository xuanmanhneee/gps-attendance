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

### Còn lại / đề xuất

- `useAttendanceSessions` vẫn còn `createSession`/`isCreating` nhưng hiện không nơi nào dùng (page mới
  gọi trực tiếp `attendanceSessionsApi.create` để không phải fetch danh sách khi vào trang tạo).
- Comment ở `types/attendance-session.ts` (`CreateSessionFormData`) còn nhắc tới "modal" — đã cũ.
- Key i18n `sessions.form.close` (dùng cho modal cũ) hiện không còn nơi dùng.
- Bước 2 nên thay bằng UI chọn lớp/đơn vị khi backend có filter tương ứng.
- Chưa có `STRUCTURE.md` cho package này; nếu tạo thì cập nhật theo cấu trúc mới
  (`components/sessions/*`, `pages/SessionCreatePage.tsx`).
