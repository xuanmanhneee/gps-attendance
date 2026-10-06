# Mobile Client — `@gps-attendance/mobile-client`

Ứng dụng Expo cho **sinh viên**: đăng nhập JWT user, xem phiên được gán, check-in GPS, lịch sử, hồ sơ.

Tổng quan: [../../README.md](../../README.md). API: [../../server/attendance/README.md](../../server/attendance/README.md). Contract: `@gps-attendance/shared`.

---

## 1. Phạm vi package

Mọi file trong `client/mobile-client/` thuộc app này: Expo Router `src/app/`, API, context, GPS/device, theme, assets.

**Không** nằm trong Docker Compose. Đây là app dành chủ yếu cho sinh viên; màn login có toggle chọn admin endpoint (`/v0/admin/auth/login`) cho lecturer/admin, còn luồng chính/tab được thiết kế cho student.

---

## 2. Công nghệ

| Hạng mục | Công nghệ |
|---|---|
| App | Expo SDK ~54, React Native 0.81, React 19.1 |
| Navigation | expo-router 6 (file-based), typed routes |
| Vị trí / thiết bị | expo-location, expo-device, expo-secure-store |
| UI | expo-linear-gradient, expo-image, vector-icons, reanimated |
| HTTP | `fetch` tự viết (`src/api/api.ts`), timeout 30s |
| Entry | `"main": "expo-router/entry"` |

Quyền: iOS `NSLocationWhenInUseUsageDescription`; Android `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` (`app.json`).

---

## 3. Cấu trúc

```text
client/mobile-client/
├── app.json / expo-env.d.ts / metro.config.js / eslint.config.js
├── .env.example
├── scripts/reset-project.js
├── assets/images/ …  assets/expo.icon/
└── src/
    ├── app/                 # Expo Router
    ├── api/
    ├── context/
    ├── services/
    ├── components/          # nghiệp vụ + UI kit + leftover Expo template
    ├── hooks/
    ├── constants/theme.ts
    ├── utils/app-alert.ts
    └── global.css
```

---

## 4. Routing (`src/app`)

Root `_layout.tsx`: `AuthProvider`, theme dark/light, Stack (`index`, `login`, `(tabs)`), splash hide.

| File | Route | Việc |
|---|---|---|
| `index.tsx` | `/` | Redirect: signed in → `/(tabs)`, chưa → `/login`. Phần template Expo phía trên file đã comment. |
| `login.tsx` | `/login` | Form MSSV/mật khẩu, logo DLU, campus footer. Không chọn giảng viên sẽ gọi `user/auth/login`; chọn giảng viên sẽ gọi `admin/auth/login`. |
| `(tabs)/_layout.tsx` | tabs | Điểm danh, Lịch học, Lịch sử, Thông tin |
| `(tabs)/index.tsx` | tab điểm danh | Tải phiên của sinh viên, vị trí/GPS và gửi check-in |
| `(tabs)/schedule.tsx` | tab lịch học | Danh sách phiên/lịch học liên quan đến sinh viên |
| `(tabs)/history.tsx` | tab lịch sử | Summary, record history và history events |
| `(tabs)/profile.tsx` | tab hồ sơ | Thông tin user và logout |
| `attendance/[id].tsx` | `/attendance/:id` | Chi tiết phiên/attendance cho check-in |
| `attendance-location/[id].tsx` | `/attendance-location/:id` | Màn vị trí phiên/check-in |
| `profile/details.tsx` | `/profile/details` | Chi tiết hồ sơ sinh viên |
| `notifications.tsx` | `/notifications` | Notification từ history events và reminder phiên |
| `home.tsx`, `explore.tsx` | route phụ/demo | Không thuộc tab điểm danh chính |

---

## 5. Auth

### `context/auth-context.tsx`

- Restore session lúc mở app (`getSession`)
- Decode JWT (sub, username, role); kiểm tra `exp`
- `login` → `AuthAPI.login` → `saveSession` (access + refresh + user + lastLoginAt)
- `logout` → gọi logout API, sau đó xóa storage local dù request thất bại
- Refresh token được lưu; context hiện không thực hiện refresh tự động. Token hết hạn bị loại bỏ khi restore session.
- Export `useAuth`

### `api/auth.api.ts`

| Hàm | HTTP |
|---|---|
| `login` | `POST /v0/user/auth/login`; nếu chọn đăng nhập giảng viên thì `POST /v0/admin/auth/login` |
| `refreshToken` | `POST /v0/user/auth/refresh` với `refreshToken` trong body |
| `logout` | `POST /v0/user/auth/logout` |

`api/user.api.ts` gọi `GET/PATCH /v0/users/me` để đọc/cập nhật hồ sơ.

### `services/token-storage.ts`

Native: `expo-secure-store`. Web: `localStorage`. Keys: `accessToken`, `refreshToken`, `user`, `lastLoginAt`.

---

## 6. Check-in và attendance API

### `api/attendance.api.ts`

| Hàm | HTTP / ghi chú |
|---|---|
| `getSessions` | `GET /v0/attendance-sessions/me` |
| `getMySummary` | `GET /v0/attendance/records/summary` |
| `getSession` | `GET /v0/attendance-sessions/:id/detail`; backend hiện yêu cầu role `admin` hoặc `lecturer`, nên tài khoản student có thể nhận 403 |
| `checkIn` | `POST /v0/attendance/check-in` |
| `getAttendanceHistory` | `GET /v0/attendance/records/mine` |
| `getAttendanceHistoryEvents` | `GET /v0/attendance/records/events/mine` |
| `getAttendanceRecord(id)` | `GET /v0/attendance/records/:id` |

### `api/api.ts`

`BASE_URL` ưu tiên `EXPO_PUBLIC_API_URL`; nếu trống, suy ra host từ Expo Metro và dùng port `3000` (fallback `127.0.0.1`). Timeout 30s. Gửi header ngrok bypass; `ApiRequestError.status` là HTTP status hoặc `0` khi lỗi mạng/timeout.

### `(tabs)/index.tsx` — luồng check-in

1. Xin quyền location, theo dõi vị trí
2. Load session được gán
3. `getStableDeviceId()` + `expo-device` + `isMockLocation` từ GPS
4. `POST` payload `{ sessionId, location, device, integrity }`
5. `AttendanceModal` hiện VALID / REVIEW / REJECTED

### `services/device-id.ts`

ID cài đặt ổn định (`installationDeviceId`): osBuildId / modelId / random, lưu SecureStore hoặc localStorage.

---

## 7. Component nghiệp vụ (đang dùng)

| File | Việc |
|---|---|
| `gps-status-card.tsx` | Trạng thái GPS, tọa độ, accuracy, lỗi |
| `attendance-modal.tsx` | Kết quả check-in |
| `confirm-dialog.tsx` | Xác nhận (logout) |
| `campus-footer.tsx` | Footer login (thông tin trường) |
| `ui/button.tsx` | Nút |
| `ui/card.tsx` | Card |
| `ui/input.tsx` | Input login |
| `AppButton.tsx` / `AppTextInput.tsx` | Biến thể UI cũ, có thể ít dùng so với `ui/` |

### `utils/app-alert.ts`

Web: `window.alert`. Native: `Alert.alert`.

### `constants/theme.ts`

`COLORS`, spacing, tab inset — dùng tab Điểm danh / History / Profile.

---

## 8. Component leftover (template Expo, không thuộc luồng chính)

Vẫn trong repo, chủ yếu phục vụ `explore.tsx` hoặc file đã comment:

| File | Ghi chú |
|---|---|
| `animated-icon.tsx` / `.web.tsx` / `.module.css` | Icon welcome Expo |
| `app-tabs.tsx` / `.web.tsx` | Tab template |
| `external-link.tsx`, `hint-row.tsx`, `web-badge.tsx` | Demo |
| `themed-text.tsx`, `themed-view.tsx` | Themed wrapper |
| `ui/collapsible.tsx`, `ui/icon-symbol.tsx` | Explore screen |
| `hooks/use-theme.ts`, `use-color-scheme.ts`, `use-color-scheme.web.ts` | Theme template |
| `scripts/reset-project.js` | Script Expo reset |

---

## 9. Env và chạy

`.env.example`:

```env
EXPO_PUBLIC_API_URL=
```

Khi để trống, app lấy host từ Expo Metro và gọi backend ở cổng `3000`, dùng được khi điện thoại và máy chạy backend cùng Wi-Fi. Khi dùng điện thoại ở mạng khác, đặt `EXPO_PUBLIC_API_URL` thành URL HTTPS của ngrok; dùng static domain để URL không đổi giữa các lần chạy. Khởi động lại Expo sau khi đổi biến môi trường.

Từ root:

```bash
pnpm dev:mobile
pnpm dev:mobile:clear
pnpm dev:mobile:offline
```

Trong package: `pnpm android` / `ios` / `web`, `pnpm lint`, `pnpm clean`.

---

## 10. Notifications, storage và giới hạn hiện tại

- Notifications ghép attendance history events với reminder từ phiên hiện tại; read/unread IDs được lưu local bằng AsyncStorage theo user. Đây không phải push notification từ máy chủ.
- Token/session dùng `expo-secure-store` native và `localStorage` trên web. App lưu access token, refresh token, user và `lastLoginAt`.
- Logout gọi backend nhưng vẫn xóa local session nếu request logout lỗi.
- `refreshToken` và `logout` hiện cố định ở user auth routes; nếu đăng nhập bằng toggle lecturer/admin trên mobile, các thao tác đó không tự chuyển sang admin auth routes. Mobile vẫn là client hướng sinh viên.
- Mobile đang gọi `/v0/attendance-sessions/:id/detail`, nhưng backend route này hiện chỉ cho `admin`/`lecturer`; student có thể gặp 403 khi mở chi tiết phiên. Đây là giới hạn cần xử lý ở API/role trước khi coi luồng chi tiết student là hoàn chỉnh.
- `home.tsx`, `explore.tsx` và một số component Expo template là route/demo phụ, không thuộc luồng tab chính.
- Mobile không được build/deploy bằng root production build hoặc Docker Compose; chạy bằng Expo scripts.

## 11. Kiểm tra và sửa lỗi

```bash
pnpm lint
pnpm web
```

Lệnh package chạy trong `client/mobile-client`; ở root dùng `pnpm dev:mobile`. Điện thoại thật không truy cập `localhost` của máy tính: đặt `EXPO_PUBLIC_API_URL` là IP LAN hoặc tunnel HTTPS và restart Metro sau khi đổi env.
