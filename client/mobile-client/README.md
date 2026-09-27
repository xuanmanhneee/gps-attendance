# Mobile Client — `@gps-attendance/mobile-client`

Ứng dụng Expo cho **sinh viên**: đăng nhập JWT user, xem phiên được gán, check-in GPS, lịch sử, hồ sơ.

Tổng quan: [../../README.md](../../README.md). API: [../../server/attendance/README.md](../../server/attendance/README.md). Contract: `@gps-attendance/shared`.

---

## 1. Phạm vi package

Mọi file trong `client/mobile-client/` thuộc app này: Expo Router `src/app/`, API, context, GPS/device, theme, assets.

**Không** nằm trong Docker Compose. Giảng viên/admin không dùng app này (`POST /v0/user/auth/login` chỉ nhận `student`).

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
| `login.tsx` | `/login` | Form MSSV/mật khẩu, logo DLU, campus footer. State `isLecturer` trên form **không đổi endpoint** — vẫn `user/auth/login`. |
| `(tabs)/_layout.tsx` | tabs | Điểm Danh / Lịch Sử / Thông Tin |
| `(tabs)/index.tsx` | tab check-in | GPS watch, list session `/mine`, gửi check-in, modal kết quả |
| `(tabs)/history.tsx` | tab lịch sử | `GET /attendance/records/mine`, pull-to-refresh |
| `(tabs)/profile.tsx` | tab hồ sơ | Thông tin user, confirm logout |
| `home.tsx` | `/home` | Màn placeholder “Chào mừng…” — **không nằm trong Stack chính** |
| `explore.tsx` | `/explore` | Màn demo Expo template — **không dùng luồng điểm danh** |

---

## 5. Auth

### `context/auth-context.tsx`

- Restore session lúc mở app (`getSession`)
- Decode JWT (sub, username, role); kiểm tra `exp`
- `login` → `AuthAPI.login` → `saveSession` (access + refresh + user + lastLoginAt)
- `logout` → gọi `AuthAPI.logout` rồi xóa storage (API logout **backend chưa có**)
- Export `useAuth`

### `api/auth.api.ts`

| Hàm | HTTP |
|---|---|
| `login` | `POST /v0/user/auth/login` |
| `refreshToken` | `POST /v0/user/auth/refresh` |
| `logout` | `POST /v0/user/auth/logout` — **server chưa implement** |

### `services/token-storage.ts`

Native: `expo-secure-store`. Web: `localStorage`. Keys: `accessToken`, `refreshToken`, `user`, `lastLoginAt`.

---

## 6. Check-in và attendance API

### `api/attendance.api.ts`

| Hàm | HTTP / ghi chú |
|---|---|
| `getSessions` | `GET /v0/attendance-sessions/mine` |
| `getSession` | `GET /v0/attendance-sessions/:id/detail` — **chi tiết session dành lecturer**; student có thể 403 |
| `checkIn` | `POST /attendance/check-in` |
| `getAttendanceHistory` | `GET /attendance/records/mine` |
| `getAttendanceRecord` | **Không gọi mạng** — trả lỗi cứng “Backend chưa cung cấp API…” |

### `api/api.ts`

`BASE_URL = EXPO_PUBLIC_API_URL \|\| http://localhost:3000`. Timeout 30s. 401 → hết hạn. Lỗi mạng hướng dẫn kiểm tra Wi‑Fi / IP LAN.

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
MOBILE_DEV_IP=192.168.1.15
EXPO_PUBLIC_API_URL=http://192.168.1.15:3000
```

Điện thoại thật **không** dùng `localhost`. Đổi mạng thì đổi IP và restart Expo (`EXPO_PUBLIC_*` nạp lúc start).

Từ root:

```bash
pnpm dev:mobile
pnpm dev:mobile:clear
pnpm dev:mobile:offline
```

Trong package: `pnpm android` / `ios` / `web`, `pnpm lint`, `pnpm clean`.

---

## 10. Hạn chế thuộc mobile

- Logout gọi endpoint chưa có trên server
- Chi tiết 1 record không có API
- `getSession` detail có thể không phù hợp role student
- Toggle “giảng viên” trên login không đổi API
- `home.tsx` / `explore.tsx` và nhiều component template không nằm luồng điểm danh
- App không đóng gói Docker
