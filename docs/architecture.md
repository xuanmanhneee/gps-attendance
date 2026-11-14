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

| Thành phần | Package                  | Công nghệ                              | Vai trò                                    |
| ---------- | ------------------------ | -------------------------------------- | ------------------------------------------ |
| Backend    | `server/attendance`      | NestJS + Prisma 7 (PostgreSQL) + Redis | API, prefix `/v0`                          |
| Admin      | `client/admin-dashboard` | React + Vite + TS                      | Giảng viên/quản trị tạo phiên, xem kết quả |
| Mobile     | `client/mobile-client`   | Expo SDK 54 (React Native 0.81)        | Sinh viên điểm danh                        |
| Shared     | `packages/shared`        | TypeScript thuần                       | Type/DTO + HTTP client dùng chung          |
| Attendance client | `packages/attendance-client` | TypeScript thuần              | Client tái sử dụng cho luồng điểm danh mobile |

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
  - Timeout, lỗi mạng và response không phải JSON (ví dụ 502/504 của nginx)
    cũng ném `ApiError` (`REQUEST_TIMEOUT`, `NETWORK_ERROR`, `UNKNOWN_ERROR`).
    `isRetryableApiError()` cho UI biết nên nhắc người dùng thử lại thay vì
    báo lỗi nghiệp vụ.
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
│   ├── attendance.api.ts       # bind package điểm danh với httpClient
│   └── index.ts                # barrel
├── context/
│   └── auth-context.tsx        # AuthProvider + useAuth (user, token, login, logout)
├── services/                   # Logic thiết bị/vị trí (không phụ thuộc React)
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
  → api/attendance.api.ts (platform adapter + httpClient)
  → @gps-attendance/attendance-client
  → @gps-attendance/shared (type + FetchHttpClient)
  → Backend (/v0/...)
```

- **Auth**: `AuthProvider` khôi phục token từ secure storage lúc khởi động,
  gọi `GET /v0/users/me` để lấy profile; `isSignedIn = !!user`. Chỉ lỗi xác
  thực (401 sau khi refresh thất bại) mới xoá token. Lỗi tạm thời
  (`isRetryableApiError`: timeout, mất mạng, 429/502/503/504) được thử lại
  tối đa 3 lần với backoff luỹ thừa + jitter (500 ms × 2^n × 0.5–1.5); nếu
  vẫn lỗi hoặc gặp lỗi khác thì giữ token, đặt `profileUnavailable = true` và
  `app/index.tsx` hiện màn hình "Thử lại" (`retryProfile()`) thay vì đẩy về
  `/login`.
- **Refresh token**: `api/http.ts` bọc mọi request đã đăng nhập bằng
  `requestWithRefresh`. Gặp 401 thì gọi `/v0/user/auth/refresh` một lần (các
  request đồng thời dùng chung một lần refresh) rồi thử lại; refresh thất bại
  thì xoá token, nhưng chỉ khi refresh bị từ chối bằng 401 (hoặc không còn
  refresh token); lỗi mạng/5xx/timeout khi refresh giữ nguyên token.
- **Check-in**: package `attendance-client` điều phối location + device, gọi
  adapter integrity → build `CheckInRequest` → `POST /v0/attendance/check-in`.
  Package sở hữu API contract và attendance types; app chỉ cung cấp HTTP,
  location, device và integrity adapter theo nền tảng.

### 3.3 API contract mobile đang dùng

| #   | Method | Path                             | Guard                             | Response type (shared)          |
| --- | ------ | -------------------------------- | --------------------------------- | ------------------------------- |
| 1   | POST   | `/v0/user/auth/login`            | LocalAuthGuard; chỉ `participant` | `LoginResponse`                 |
| 2   | POST   | `/v0/user/auth/refresh`          | Public, kiểm tra refresh token    | `LoginResponse`                 |
| 3   | GET    | `/v0/users/me`                   | JWT                               | `UserProfileResponse`           |
| 4   | GET    | `/v0/attendance-sessions/me`     | JWT                               | `MyAttendanceSessionResponse[]` |
| 5   | POST   | `/v0/attendance/check-in`        | JWT                               | `CheckInResponse`               |

`CheckInResponse` là discriminated union: `{ status: 'VALID' }` hoặc
`{ status: 'REVIEW' | 'REJECTED', reasons: [...] }`. Khi nhận `REVIEW`, server
tự động tạo candidate để organizer xử lý; mobile không cần gửi thêm request.

Danh sách đầy đủ endpoint, payload, quyền và error code nằm tại
[`docs/api.md`](api.md). `userId` trong JWT là `User.id`, không phải
`Account.id`.

## 4. Trạng thái hiện tại của luồng điểm danh

Đã có:

- Login → lưu token → lấy profile → vào tab Home.
- `GET /v0/attendance-sessions/me` → render danh sách phiên + trạng thái
  (`getStudentSessionStatus`: pending/absent/present/late/excused/closed/cancelled
  — nhánh `cancelled` xét TRƯỚC để không bị tính đè thành `absent`).
- Lỗi tạm thời (timeout, mất mạng, server quá tải) ở màn đăng nhập, tải danh
  sách phiên và điểm danh hiển thị lời nhắc thử lại, không báo nhầm thành
  "sai mật khẩu" hay "điểm danh thất bại".
- Nút điểm danh chỉ enable khi `status === 'absent'`; nhãn nút đổi theo trạng thái
  (`getCheckInButtonLabel`) nên phiên `closed`/`cancelled`/`pending` không còn hiện
  "Điểm danh ngay"; gọi `attendanceApi.checkIn(sessionId)` →
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

| #   | Mức | Mô tả                                                              | Vị trí                      |
| --- | --- | ------------------------------------------------------------------ | --------------------------- |
| 1   | 🟡  | `integrity.ts` trả `null` (chưa có Play Integrity/App Attest thật) | `src/services/integrity.ts` |
| 3   | 🟢  | Chưa có tab Lịch sử điểm danh                                      | `src/app/(tabs)/`           |

Auto refresh token khi 401 đã có (xem mục 3.2).

Đã xử lý (15/11/2026): `restoreAuth` không còn xoá token với mọi lỗi. Lỗi tạm
thời được thử lại có backoff + jitter, sau đó hiện màn hình thử lại; chỉ 401
sau refresh mới đăng xuất (mục 3.2). `refreshSession` cũng chỉ xoá token khi
bị 401. Chưa có cache profile cục bộ nên mất mạng thì chưa vào được app.

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

- `home.tsx` gọi `attendanceApi.checkIn(sessionId)`; package gom GPS + device +
  integrity qua platform adapter, không còn payload stub.
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

## 8. Server: đường nóng và chịu tải

Dữ liệu điểm danh của phiên đang mở nằm trong Redis, chỉ xuống PostgreSQL khi
phiên đóng. Các key chính:

| Key | Kiểu | Nội dung |
| --- | --- | --- |
| `attendance:buffer:{sessionId}` | Hash `userId → record JSON` | Roster của phiên; check-in cập nhật tại đây |
| `attendance:open-buffers` | Set | Id các phiên đang có buffer, dùng cho `GET /me` |
| `attendance:device:{sessionId}:{deviceId}` | String, có TTL | Thiết bị đã dùng trong phiên (chống trùng thiết bị) |
| `attendance:buffer-flushing:{sessionId}` | String | Khoá chặn ghi mới khi đang flush |

- **Khởi tạo roster**: ghi cả roster bằng script Lua `HSETNX`, 500 record mỗi
  lần gọi, kèm `SADD` vào `attendance:open-buffers`. Không ghi đè record đã có,
  nên chạy lại không làm mất check-in.
- **Check-in**: một script Lua kiểm tra khoá flush, record và thiết bị rồi ghi
  `present` và giữ thiết bị trong cùng thao tác nguyên tử.
- **Flush** (job `attendance:flush` sau khi phiên đóng): đặt khoá và lấy
  snapshot nguyên tử, ghi xuống PostgreSQL, rồi mới xoá buffer và `SREM` khỏi
  tập chỉ mục. PostgreSQL lỗi thì buffer còn nguyên để job thử lại.
- **`GET /me`** (`findByUser`): đọc `attendance:open-buffers` rồi lấy record
  của sinh viên ở mọi buffer bằng một script Lua, gộp với các phiên đã flush
  trong PostgreSQL. Khi khởi động, server quét buffer có sẵn để nạp lại tập
  chỉ mục (phòng buffer do phiên bản cũ tạo).
- **Cache phiên**: phiên điểm danh được cache trong Redis (read-through,
  write-through, TTL 1 giờ).
- **Kết nối**: pool PostgreSQL mỗi instance giới hạn bởi `DB_POOL_MAX` (mặc
  định 15); HTTP backlog `HTTP_BACKLOG` (mặc định 4096).
- **Health**: `GET /health` kiểm tra PostgreSQL và Redis (xem `docs/api.md`).

Stack đo tải tách riêng (`docker-compose.perf.yml`, hướng dẫn tại
`server/attendance/perf/README.md`): nginx cân bằng tải trước
`PERF_API_REPLICAS` instance API, k6 cho check-in (`check-in.js`), tranh chấp
(`check-in-race.js`) và API đọc (`read-api.js`), script đo khởi tạo roster
(`roster`). Kết quả đo lưu tại `server/attendance/perf/RESULTS-<ngày>.md`.
