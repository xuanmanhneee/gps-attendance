# Architecture — GPS Attendance

> Tài liệu này tóm tắt bối cảnh (context) toàn dự án, tập trung vào
> `client/mobile-client`, và ghi lại các "gap" cần xử lý để khép kín luồng
> điểm danh. Đây là tài liệu kiến trúc, **không phải** quy ước code — các
> quy ước nằm ở `docs/conventions/`.

## 1. Tổng quan

Hệ thống điểm danh tự động bằng định vị GPS thời gian thực, có cơ chế chống
gian lận (giả mạo vị trí, trùng thiết bị) và thiết kế chịu tải khi nhiều sinh
viên điểm danh cùng lúc.

Là **pnpm workspace monorepo** — dùng chung 1 `pnpm-lock.yaml` ở root.

| Thành phần | Package | Công nghệ | Vai trò |
|---|---|---|---|
| Backend | `server/attendance` | NestJS + Prisma 7 (PostgreSQL) + Redis | API, prefix `/v0` |
| Admin | `client/admin-dashboard` | React + Vite + TS | Giảng viên/quản trị tạo phiên, xem kết quả |
| Mobile | `client/mobile-client` | Expo SDK 54 (React Native 0.81) | Sinh viên điểm danh |
| Shared | `packages/shared` | TypeScript thuần | Type/DTO + HTTP client dùng chung |

Luồng nghiệp vụ: giảng viên tạo **phiên điểm danh** (thời gian, toạ độ tâm,
bán kính) → sinh viên mở app trong khung thời gian, app lấy GPS → server kiểm
tra (khoảng cách, dấu hiệu mock, trùng thiết bị) → ghi nhận kết quả và hiển
thị ở admin dashboard.

## 2. Kiến trúc `packages/shared`

Nguồn type + HTTP client dùng chung cho cả server, admin, mobile. Mobile và
admin đọc trực tiếp file `.ts` nguồn (bundler); server đọc bản build `dist/`.

- `src/types/` — `Location`, `Device`, `DeviceIntegrity`, `CheckInRequest`,
  `CheckInResponse`, `MyAttendanceSessionResponse`, `UserProfileResponse`,
  `LoginResponse`, `Role`, `SessionStatus`, `AttendanceStatus`...
- `src/api/` — `createHttpClient()` tạo `FetchHttpClient`:
  - `baseUrl` + `getToken()` (inject `Authorization: Bearer`).
  - Timeout 30s, parse response theo `ApiResponse<T>` (discriminated union).
  - Lỗi nghiệp vụ ném `ApiError { code, message, status }`; 401 gọi
    `onUnauthorized`.
- `src/api/response/codes/` — error code namespaced theo domain
  (`AuthErrorCode`, `AttendanceSessionErrorCode`, `CommonErrorCode`...).

Quy ước response/error code: xem `docs/conventions/api-response.md`.

## 3. Kiến trúc `client/mobile-client`

### 3.1 Cấu trúc `src/`

```
src/
├── app/                        # Expo Router (file-based routing)
│   ├── _layout.tsx             # Root: AuthProvider + Stack (headerShown=false)
│   ├── index.tsx               # Splash: chờ auth -> redirect /home | /login
│   ├── login.tsx               # Màn đăng nhập
│   ├── dev.tsx                 # Trang ẩn: công cụ dev (bật ở Profile)
│   └── (tabs)/
│       ├── _layout.tsx         # Tab bar: home, profile
│       ├── home.tsx            # Danh sách phiên + nút điểm danh
│       └── profile.tsx         # Tài khoản, công tắc "Chế độ dev", đăng xuất
├── api/                        # HTTP layer (gọi qua shared createHttpClient)
│   ├── http.ts                 # httpClient (base URL từ EXPO_PUBLIC_API_URL)
│   ├── auth.api.ts             # login / logout / refreshToken
│   ├── user.api.ts             # getProfile
│   ├── attendance-sessions.api.ts  # getSessions
│   ├── attendance-check-in.api.ts  # checkIn
│   └── index.ts                # barrel
├── context/
│   └── auth-context.tsx        # AuthProvider + useAuth (user, token, login, logout)
├── services/                   # Logic thiết bị/vị trí (không phụ thuộc React)
│   ├── attendance.ts           # collectCheckInContext / buildCheckInPayload / checkIn
│   ├── dev-mode.ts             # cờ "Chế độ dev" + ép mock location
│   ├── device-id.ts            # deviceId ổn định (AndroidId / iOS vendorId / UUID)
│   ├── device-info.ts          # buildDeviceInfo -> Device
│   ├── integrity.ts            # getIntegrity -> stub (Play Integrity/App Attest sau)
│   ├── location.ts             # getCurrentLocation -> Location (expo-location)
│   ├── storage.ts              # SecureStore (web -> localStorage)
│   └── token.ts                # lưu/khôi phục/xoá JWT
├── hooks/
│   ├── use-check-in-context.ts # state location/device/integrity + refresh/reset
│   └── use-now.ts              # "now" tự cập nhật tại mốc openAt/closeAt + foreground
├── components/
│   ├── ui/                     # button, input
│   ├── campus-footer.tsx       # Footer trang trí ở màn login
│   └── debug-device-card.tsx   # Hiển thị GPS/device/integrity (dùng ở trang Dev)
└── global.css
theme/                          # Design token DUY NHẤT (root): colors, spacing, typography, radius
```

Ánh xạ alias: `@/*` → `./src/*`, `@/assets/*` → `./assets/*`.

### 3.2 Data flow

```
Screen (app/**)
  → Components (ui/, feature)
  → Context (useAuth) / Hooks (use-check-in-context)
  → services/* (location, device, integrity)
  → api/*  (httpClient)
  → @gps-attendance/shared (type + FetchHttpClient)
  → Backend (/v0/...)
```

- **Auth**: `AuthProvider` khôi phục token từ secure storage lúc khởi động,
  gọi `GET /v0/users/me` để lấy profile; `isSignedIn = !!user`.
- **Check-in**: `services/attendance.ts` gom song song location + device +
  integrity (`Promise.all`) → build `CheckInRequest` → `POST /v0/attendance/check-in`.

### 3.3 API contract mobile đang dùng

| # | Method | Path | Guard | Response type (shared) |
|---|---|---|---|---|
| 1 | POST | `/v0/user/auth/login` | LocalAuthGuard (chỉ `student`) | `LoginResponse { accessToken }` |
| 2 | POST | `/v0/user/auth/logout` | JWT | `null` — ⏸️ mobile **tạm thời chưa gọi** |
| 3 | POST | `/v0/user/auth/refresh` | JWT | `{ accessToken }` |
| 4 | GET | `/v0/users/me` | JWT | `UserProfileResponse` |
| 5 | GET | `/v0/attendance-sessions/me` | JWT | `MyAttendanceSessionResponse[]` |
| 6 | POST | `/v0/attendance/check-in` | JWT | `CheckInResponse` |

`CheckInResponse` là discriminated union: `{ status: 'VALID' }` hoặc
`{ status: 'REVIEW' | 'REJECTED', reasons: [...] }` với reason gồm
`OUT_OF_RANGE | MOCK_LOCATION | LOW_CONFIDENCE_SCORE | TOO_MANY_ATTEMPTS | DUPLICATE_DEVICE`.

> Lưu ý `userId` trong JWT là `User.id` (không phải `Account.id`) — xem
> `docs/conventions/auth-guards.md`.

## 4. Trạng thái hiện tại của luồng điểm danh

Đã có:
- Login → lưu token → lấy profile → vào tab Home.
- `GET /v0/attendance-sessions/me` → render danh sách phiên + trạng thái
  (`getStudentSessionStatus`: pending/absent/present/late/excused/closed/cancelled
  — nhánh `cancelled` xét TRƯỚC để không bị tính đè thành `absent`).
- Nút điểm danh chỉ enable khi `status === 'absent'`; nhãn nút đổi theo trạng thái
  (`getCheckInButtonLabel`) nên phiên `closed`/`cancelled`/`pending` không còn hiện
  "Điểm danh ngay"; gọi `checkIn(sessionId)` (`services/attendance`) →
  GPS/device/integrity thật.
- Kết quả: `VALID` → set `present` + alert thành công; `REVIEW`/`REJECTED` →
  alert `getCheckInFailureMessage(reasons)`; `LocationPermissionError` → alert
  xin quyền vị trí.
- Trạng thái phiên tự cập nhật đúng lúc qua `openAt`/`closeAt` và khi app trở lại
  foreground: `useNow(boundaries)` → gọi lại `GET /me` ở chế độ nền (không alert)
  để trạng thái + nút khớp server. **Không** tự tính giờ ở client — server là
  nguồn chân lý, tránh lệch giờ máy và lặp lại logic đã gây bug `cancelled`.

Chưa xong:
- `integrity.ts` vẫn là stub (trả `null`) — xem mục 5.

## 5. Gap / nợ kỹ thuật (cần xử lý để khép kín luồng)

| # | Mức | Mô tả | Vị trí |
|---|---|---|---|
| 1 | 🟡 | `integrity.ts` trả `null` (chưa có Play Integrity/App Attest thật) | `src/services/integrity.ts` |
| 2 | 🟡 | Chưa auto refresh token khi 401 | `src/api/http.ts` |
| 3 | 🟢 | Chưa có tab Lịch sử điểm danh | `src/app/(tabs)/` |

Đã xử lý ở B1–B3: payload điểm danh thật; xoá `attendance-modal.tsx` /
`gps-status-card.tsx` / `attendance-session-card.tsx` (dead + stale); xoá starter
code (`explore.tsx`, `themed-*`, `app-tabs*`, `web-badge`, `animated-icon*`,
`hint-row`, `collapsible`, `icon-symbol`, `external-link`, `AppButton`,
`AppTextInput`, `ui/card`) và các barrel stale; gộp về **một** hệ theme `theme/`
(đã xoá `constants/theme.ts`, `hooks/use-theme.ts`, `hooks/use-color-scheme*`);
cập nhật `STRUCTURE.md`.

## 6. Kế hoạch (B1–B3 đã hoàn thành ✅)

Mục tiêu: khép kín **1 luồng duy nhất** = login → xem phiên → bấm điểm danh
bằng dữ liệu thật → nhận kết quả → cập nhật trạng thái. Không mở rộng xa.

### B1 — Wire dữ liệu thật vào điểm danh ✅
- `home.tsx` gọi `checkIn(sessionId)` từ `services/attendance` (GPS + device +
  integrity gom trong service), không còn payload stub.
- Bắt `LocationPermissionError` (alert xin quyền vị trí) và lỗi API chung.
- `VALID` → set `present` + alert thành công; `REVIEW`/`REJECTED` → alert
  `getCheckInFailureMessage(reasons)`.

### B2 — Chuẩn hoá type & kết quả ✅
- Xoá `attendance-modal.tsx`, `gps-status-card.tsx`, `attendance-session-card.tsx`
  (dead/stale — home render inline và dùng `showAlert`).
- Xoá barrel stale `components/index.ts`, `ui/index.ts`, `context/index.ts`.

### B3 — Dọn dẹp tối thiểu + cập nhật tài liệu ✅
- Xoá starter code không dùng (`explore.tsx`, `themed-*`, `app-tabs*`,
  `web-badge`, `animated-icon*`, `hint-row`, `collapsible`, `icon-symbol`,
  `external-link`, `AppButton`, `AppTextInput`, `ui/card`).
- Gộp **1** hệ theme: giữ `theme/` (bổ sung `radius.ts`, `fontSizes`/`fontWeights`),
  xoá `constants/theme.ts` + `hooks/use-theme.ts` + `hooks/use-color-scheme*`;
  migrate `login.tsx`, `(tabs)/profile.tsx`, `components/ui/{button,input}.tsx`
  sang `theme/`.
- Viết lại `STRUCTURE.md` cho khớp thực tế.

### Ngoài scope (giai đoạn 2)
- Play Integrity (Android) / App Attest (iOS) thật trong `integrity.ts`.
- Tab Lịch sử điểm danh.
- GPS "follow" liên tục / cập nhật khoảng cách realtime.
- Auto refresh token khi 401.

## 7. Cách chạy & kiểm thử

```bash
pnpm install
pnpm build:shared
pnpm dev:server     # http://localhost:3000 (cần docker compose up -d cho Postgres/Redis)
pnpm dev:mobile     # quét QR bằng Expo Go (dùng thiết bị thật cho GPS)
```

- Cấu hình `EXPO_PUBLIC_API_URL` trong `client/mobile-client/.env`
  (mẫu: `.env.example`).
- GPS/anti-spoofing cần thiết bị thật để kiểm thử chính xác.
- Lint mobile: `pnpm --filter @gps-attendance/mobile-client lint`.

