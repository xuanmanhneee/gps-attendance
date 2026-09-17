# Mobile Client App Structure

Dự án React Native (Expo) được tổ chức theo kiến trúc modular, dễ bảo trì và mở rộng.

## 📁 Cấu Trúc Thư Mục

```
client/mobile-client/src/
│
├── 📁 app/                           # Định tuyến (Expo Router)
│   ├── 📄 _layout.tsx                # Root layout - bọc AuthProvider & ThemeProvider
│   ├── 📄 login.tsx                  # Màn hình Đăng nhập
│   │
│   └── 📁 (tabs)/                    # Tab navigation (Protected)
│       ├── 📄 _layout.tsx            # Tab bar configuration
│       ├── 📄 index.tsx              # 🎯 Màn hình Điểm Danh Chính
│       ├── 📄 history.tsx            # Lịch sử điểm danh
│       └── 📄 profile.tsx            # Thông tin cá nhân & Đăng xuất
│
├── 📁 context/                       # Quản lý trạng thái toàn cục
│   ├── 📄 auth-context.tsx           # Auth context (User + JWT Token)
│   └── 📄 index.ts                   # Export barrel
│
├── 📁 api/                           # HTTP API layer
│   ├── 📄 api.ts                     # HTTP client cấu hình
│   ├── 📄 auth.api.ts                # Auth endpoints (/auth/*)
│   ├── 📄 attendance.api.ts          # Attendance endpoints (/attendance/*)
│   └── 📄 index.ts                   # Export barrel
│
├── 📁 components/                    # UI Components
│   ├── 📁 ui/                        # Reusable UI components
│   │   ├── 📄 button.tsx             # Custom button component
│   │   ├── 📄 card.tsx               # Card/container component
│   │   ├── 📄 input.tsx              # Input field component
│   │   └── 📄 index.ts               # Export barrel
│   │
│   ├── 📄 gps-status-card.tsx        # GPS coordinates display
│   ├── 📄 attendance-modal.tsx       # Attendance result modal
│   └── 📄 index.ts                   # Export barrel
│
├── 📁 hooks/                         # Custom React hooks
│   ├── 📄 use-color-scheme.ts        # Detect dark/light mode
│   ├── 📄 use-color-scheme.web.ts    # Web platform specific
│   └── 📄 use-theme.ts               # Theme hook
│
├── 📁 constants/                     # Constants & configs
│   ├── 📄 theme.ts                   # Colors, spacing, typography
│   └── 📄 index.ts                   # Export barrel (optional)
│
└── 📄 global.css                     # Global styles
```

## 🔄 Data Flow

```
User Screen
     ↓
Components (Button, Input, Card)
     ↓
Hooks (useAuth, useTheme)
     ↓
Context (AuthProvider, AuthContext)
     ↓
API Layer (AuthAPI, AttendanceAPI)
     ↓
Backend Server
```

## 🎯 Key Features

### Authentication (`context/auth-context.tsx`)
- Manages user login/logout
- Stores JWT token in secure storage
- Persists user session on app restart
- Provides `useAuth()` hook for access anywhere

### API Layer (`api/`)
- **api.ts**: Base HTTP client with token support
- **auth.api.ts**: Login, logout, refresh token
- **attendance.api.ts**: Sessions, check-in, history

### Screens

#### Login (`app/login.tsx`)
- Username + password input
- Form validation
- Redirects to tabs on success

#### Attendance (`app/(tabs)/index.tsx`)
- GPS status display
- Active sessions list
- Check-in button per session
- Real-time location tracking

#### History (`app/(tabs)/history.tsx`)
- Attendance records list
- Validation status display
- Score visualization

#### Profile (`app/(tabs)/profile.tsx`)
- User info display
- Account settings
- Logout button

### Components

#### UI Components (`components/ui/`)
- **Button**: Customizable button (primary, secondary, danger)
- **Card**: Container with border and shadow
- **Input**: Text input with validation

#### Feature Components
- **GPSStatusCard**: Shows latitude, longitude, accuracy
- **AttendanceModal**: Shows check-in result (approved/flagged/rejected)

## 🎨 Design System

### Colors (`constants/theme.ts`)
- **Primary**: #3B82F6 (Blue)
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Amber)
- **Error**: #EF4444 (Red)

### Spacing
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px

### Dark Mode
- Light mode colors also available in `COLORS_LIGHT`
- Automatic detection via `useColorScheme()` hook

## 📡 API Integration

### AuthAPI
```typescript
await AuthAPI.login(username, password)
await AuthAPI.logout(token)
await AuthAPI.refreshToken(token)
await AuthAPI.getCurrentUser(token)
```

### AttendanceAPI
```typescript
await AttendanceAPI.getSessions(token)
await AttendanceAPI.checkIn(payload, token)
await AttendanceAPI.getAttendanceHistory(token)
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

- JWT tokens stored in AsyncStorage (consider using secure storage for production)
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
- Use `COLORS` from `constants/theme.ts`
- Use `Spacing` for consistent spacing
- Use `Typography` for consistent text styles

## 📝 Notes

- All components use TypeScript for type safety
- Screens protected by `JwtAuthGuard` via login check
- GPS requires real device (or emulator with GPS simulation)
- Mock location detection works best on Android

---

**Last Updated**: 2025-09-03
