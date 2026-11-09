# Mobile Client App Structure

Dự án React Native (Expo) được tổ chức theo kiến trúc modular, dễ bảo trì và mở rộng.

## 📁 Cấu Trúc Thư Mục

```
client/mobile-client/
│
├── 📁 src/
│   │
│   ├── 📁 app/                        # Định tuyến (Expo Router)
│   │   ├── 📄 _layout.tsx             # Root layout - bọc AuthProvider & Stack
│   │   ├── 📄 index.tsx               # Splash: chờ auth → redirect /home | /login
│   │   ├── 📄 login.tsx               # Màn hình Đăng nhập
│   │   ├── 📄 dev.tsx                 # Trang ẩn (chỉ vào khi bật dev mode ở Profile)
│   │   │
│   │   └── 📁 (tabs)/                 # Tab navigation
│   │       ├── 📄 _layout.tsx         # Tab bar: home, profile
│   │       ├── 📄 home.tsx            # Danh sách phiên + nút điểm danh
│   │       └── 📄 profile.tsx         # Thông tin cá nhân, dev mode & Đăng xuất
│   │
│   ├── 📁 context/                    # Quản lý trạng thái toàn cục
│   │   └── 📄 auth-context.tsx        # AuthProvider + useAuth (user, token, login, logout)
│   │
│   ├── 📁 api/                        # HTTP API layer
│   │   ├── 📄 http.ts                 # httpClient (baseUrl từ EXPO_PUBLIC_API_URL)
│   │   ├── 📄 auth.api.ts             # login / logout / refreshToken
│   │   ├── 📄 user.api.ts             # getProfile
│   │   ├── 📄 attendance-sessions.api.ts   # getSessions
│   │   ├── 📄 attendance-check-in.api.ts   # checkIn
│   │   └── 📄 index.ts                # Export barrel
│   │
│   ├── 📁 components/                 # UI Components
│   │   ├── 📁 ui/                     # Reusable UI components
│   │   │   ├── 📄 button.tsx          # Custom button component
│   │   │   └── 📄 input.tsx           # Input field component
│   │   │
│   │   ├── 📄 campus-footer.tsx       # Footer trang trí ở màn đăng nhập
│   │   └── 📄 debug-device-card.tsx   # Hiển thị GPS/device/integrity (dùng ở trang Dev)
│   │
│   ├── 📁 hooks/                      # Custom React hooks
│   │   ├── 📄 use-check-in-context.ts # state location/device/integrity + refresh/reset
│   │   │                              #   + export type CheckInContext
│   │   └── 📄 use-now.ts              # "now" tự cập nhật tại mốc openAt/closeAt + foreground
│   │
│   ├── 📁 services/                   # Logic thiết bị/vị trí + cấu hình (không phụ thuộc React)
│   │   ├── 📄 attendance.ts           # collectCheckInContext / buildCheckInPayload / checkIn
│   │   │                              #   (áp override mock location của dev mode)
│   │   ├── 📄 dev-mode.ts             # cờ "Chế độ dev" + ép mock location (trang Dev)
│   │   ├── 📄 device-id.ts            # deviceId ổn định (AndroidId / iOS vendorId / UUID)
│   │   ├── 📄 device-info.ts          # buildDeviceInfo → Device
│   │   ├── 📄 location.ts             # getCurrentLocation → Location (expo-location)
│   │   ├── 📄 storage.ts              # SecureStore (web → localStorage)
│   │   └── 📄 token.ts                # lưu/khôi phục/xoá JWT
│   │
│   ├── 📁 modules/integrity/          # Boundary có thể tách package sau
│   │   ├── 📄 integrity-provider.ts   # Contract chung cho platform adapter
│   │   ├── 📄 android-integrity.provider.ts # Play Integrity Standard
│   │   ├── 📄 unsupported-integrity.provider.ts # iOS/web fallback
│   │   └── 📄 index.ts                # Public API duy nhất của module
│   │
│   └── 📄 global.css                  # Global styles
│
└── 📁 theme/                          # Design token dùng chung (nguồn duy nhất)
    ├── 📄 index.ts                    # barrel: colors, spacing, typography, radius
    ├── 📄 colors.ts                   # Bảng màu (primary, surface, text, danger...)
    ├── 📄 spacing.ts                  # xs → xxxl
    ├── 📄 typography.ts               # title/heading/body/caption + fontSizes/fontWeights
    └── 📄 radius.ts                   # sm → full
```

## 🔄 Data Flow

```
Screen (app/**)
  → Components (components/ui, feature)
  → Context (useAuth) / Hooks (use-check-in-context, use-now)
  → services/* (attendance, location, device) / modules/integrity
  → api/* (httpClient)
  → @gps-attendance/shared (type + FetchHttpClient)
  → Backend Server (/v0/...)
```

## 🎯 Key Features

### Authentication (`context/auth-context.tsx`)
- Manages user login/logout
- Stores JWT token in secure storage
- Persists user session on app restart
- Provides `useAuth()` hook for access anywhere

### API Layer (`api/`)
- **http.ts**: `httpClient` tạo từ `createHttpClient()` của shared, inject `Authorization: Bearer`
- **auth.api.ts**: login / logout / refreshToken
- **user.api.ts**: getProfile
- **attendance-sessions.api.ts**: getSessions
- **attendance-check-in.api.ts**: checkIn

### Screens

#### Login (`app/login.tsx`)
- Username + password input
- Form validation
- Redirects to `/home` on success

#### Home (`app/(tabs)/home.tsx`)
- Danh sách phiên điểm danh (`GET /v0/attendance-sessions/me`)
- Trạng thái từng phiên + nút điểm danh (chỉ enable khi trạng thái là `absent`)
- Nhãn nút theo trạng thái: `absent` → "Điểm danh ngay"; `pending`/`closed`/`cancelled`
  → "Chưa mở"/"Đã kết thúc"/"Đã huỷ"; `present`/`late`/`excused` → "Đã điểm danh"
- Tự gọi lại `/me` khi qua mốc `openAt`/`closeAt` hoặc app trở lại foreground (`useNow`)
- Debug device card (GPS/device/integrity)

#### Profile (`app/(tabs)/profile.tsx`)
- Thông tin tài khoản (họ tên, mã số, vai trò)
- Công tắc "Chế độ dev" — lưu ở secure storage qua `services/dev-mode.ts`
  - Bật → hiện thêm nút "Mở trang dev" → `router.push('/dev')`
- Nút đăng xuất

#### Dev (`app/dev.tsx`)
- Trang ẩn, chỉ vào được khi bật "Chế độ dev" ở Profile
- Card `DebugDeviceCard`: GPS, độ chính xác, deviceId, model, mock location.
  Integrity token chỉ được tạo khi có `sessionId`, nên trang dev không tạo token
  không gắn với một lần điểm danh thật. Dữ liệu lấy từ `useCheckInContext` rồi truyền
  xuống card qua prop `context` (card chỉ hiển thị, không tự gọi hook)
- Nhóm "Tuỳ chỉnh":
  - Công tắc "Giả lập mock location" → ép `isMockLocation = true` trong payload
    điểm danh (`services/attendance.ts`); server trả `REJECTED / MOCK_LOCATION`.
    Tắt "Chế độ dev" ở Profile sẽ xoá luôn cờ này
  - "Đổi deviceId mới" → `resetDeviceId()` sinh `debug-<uuid>` rồi đọc lại
  - "Làm mới dữ liệu thiết bị" → đọc lại GPS/device

### Components

#### UI Components (`components/ui/`)
- **Button**: Customizable button (primary, secondary, outline, danger)
- **Input**: Text input with password toggle + error message

#### Feature Components
- **CampusFooter**: Footer trang trí ở màn đăng nhập
- **DebugDeviceCard**: Hiển thị GPS/device/integrity để debug

## 🎨 Design System

Toàn bộ design token nằm ở `theme/` (ngoài `src/`), import qua barrel:

```typescript
import { colors } from '../../theme';
```

### Colors (`theme/colors.ts`)
- **primary**: #7BAE7F (xanh lá), `primaryDark` #5F9465, `primaryLight` #EAF4EA
- **success**: #4F8A58, `successLight` #E5F2E7
- **warning**: #B38A3A, `warningLight` #F8F0D9
- **danger**: #C65D5D, `dangerLight` #F8E5E5
- **background**: #F6F9F5, **surface**: #FFFFFF
- **text**: #26332A, **textSecondary**: #6F7D72, **textMuted**: #9AA59D
- **border**: #E3EAE3, **disabled**: #B8C2BA

### Spacing (`theme/spacing.ts`)
- xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32

### Radius (`theme/radius.ts`)
- sm: 4, md: 8, lg: 12, xl: 16, full: 9999

### Typography (`theme/typography.ts`)
- `title` / `heading` / `body` / `caption` + `fontSizes` (xs → 4xl) và `fontWeights`

> Không có dark mode — app dùng một bảng màu sáng duy nhất.

## 📡 API Integration

### `authApi` / `userApi`
```typescript
await authApi.login(username, password)
await authApi.logout()      // ⏸️ tạm thời chưa được gọi (xem ghi chú dưới)
await authApi.refreshToken()
await userApi.getProfile()
```

> ⏸️ **Tạm thời**: `logout()` trong `context/auth-context.tsx` **không** gọi
> endpoint `/v0/user/auth/logout` — chỉ xoá `user` / `token` state và SecureStore.
> Hàm `authApi.logout()` vẫn giữ nguyên (có `TODO` trong code) để bật lại sau.

### `attendanceSessionsApi` / `attendanceCheckInApi`
```typescript
await attendanceSessionsApi.getSessions()
await attendanceCheckInApi.checkIn(payload)
```

## 🚀 Getting Started

### Installation
```bash
pnpm install
pnpm build:shared
```

### Development
```bash
pnpm dev:mobile
# Scan QR code with Expo Go
```

### Build
```bash
eas build --platform ios   # iOS
eas build --platform android  # Android
```

## 📦 Dependencies

- **expo**: React Native framework
- **expo-router**: File-based routing
- **expo-location**: GPS access
- **expo-device**: Device info
- **react-native-gesture-handler**: Gesture support
- **react-native-reanimated**: Animations

## 🔐 Security Notes

- JWT token lưu bằng `expo-secure-store` (`services/storage.ts`, fallback localStorage trên web)
- Token sent in Authorization header for authenticated requests
- API timeout: 30 seconds
- Error handling and user feedback for API failures

## 🛠️ Development Tips

### Adding a New Screen
1. Create file in `app/(tabs)/` or `app/`
2. Implement screen component
3. Import in parent layout if needed

### Adding a New API Endpoint
1. Add method in `api/attendance.api.ts` or `api/auth.api.ts`
2. Define types in the same file
3. Export from `api/index.ts`
4. Use in components with `useAuth()` hook

### Styling
- Import design token từ `theme/`: `import { colors } from '../../theme';`
- Dùng `colors` / `spacing` / `radius` / `typography`, không hardcode mã màu mới
- `StyleSheet.create` đặt cuối file

## 📝 Notes

- All components use TypeScript for type safety
- Điều hướng bảo vệ phía client: `app/index.tsx` redirect theo `isSignedIn`
- GPS requires real device (or emulator with GPS simulation)
- Mock location detection works best on Android
- Theme duy nhất: `theme/` — không còn `constants/theme.ts`

---

**Last Updated**: 2026-10-10
