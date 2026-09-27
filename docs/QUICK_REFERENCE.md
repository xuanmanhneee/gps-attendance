# Quick reference - GPS Attendance

## 1. Chạy nhanh

```bash
cd gps-attendance-main
pnpm install
pnpm dev:attendance
pnpm dev:admin
pnpm dev:mobile
```

## 2. Các URL chính

- Backend API: http://localhost:3000
- Dashboard: http://localhost:5173
- Mobile app: Expo Go / simulator

## 3. Các route API chính

```text
POST /v0/user/auth/login
POST /v0/admin/auth/login
GET /v0/attendance-sessions
GET /v0/attendance-sessions/:id
POST /v0/attendance-sessions
POST /attendance/check-in
GET /attendance/records/mine
GET /users/me
```

## 4. Vai trò người dùng

- student
- lecturer
- admin

## 5. Quy ước response

```ts
{ success: true, data: ... }
```

```ts
{ success: false, code: 'ERROR_CODE', message: '...' }
```

## 6. Biến môi trường cần chú ý

```env
EXPO_PUBLIC_API_URL=http://192.168.1.12:3000
```

Dashboard dùng `VITE_API_BASE_URL`. Mobile hiện có các hàm client `logout` và
`refreshToken`, nhưng backend chưa cung cấp hai route tương ứng.

## 7. Lệnh build

```bash
pnpm build:shared
pnpm build:attendance
pnpm build:admin
```

## 8. Tham khảo nhanh

- [../README.md](../README.md)
- [system-overview.md](system-overview.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [conventions](conventions)

```

---

## 🗂️ File Organization Rules

### NestJS Module Structure

Each domain follows:
```
<domain>/
  <domain>.module.ts          # DI config
  <domain>.controller.ts      # HTTP endpoints
  <domain>.service.ts         # Business logic
  <domain>.repository.ts      # Interface (abstract)
  <domain>.repository.token.ts # DI token
  <domain>.model.ts           # Data interface
  dto/                        # DTOs with validation
  repositories/
    mock-<domain>.repository.ts # Mock implementation
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Files | kebab-case | `attendance-sessions.service.ts` |
| Classes | PascalCase | `AttendanceSession` |
| Interfaces | PascalCase | `User`, `ApiResponse<T>` |
| Constants | SCREAMING_SNAKE_CASE | `ATTENDANCE_SESSION_NOT_FOUND` |
| Variables | camelCase | `userId`, `sessionId` |

### Error Codes

```typescript
// Define in packages/shared/src/api/response/error_codes/
export const AttendanceSessionErrorCode = {
  NOT_FOUND: 'ATTENDANCE_SESSION_NOT_FOUND',
  INVALID_TIME_RANGE: 'ATTENDANCE_SESSION_INVALID_TIME_RANGE',
  CREATION_FORBIDDEN: 'ATTENDANCE_SESSION_CREATION_FORBIDDEN',
} as const;

// Export via packages/shared/src/api/<domain>/index.ts
```

---

## 🔄 Validation Score Calculation

```
locationCoeff = distance / radiusLimit           (0-1)
mockCoeff = mockLocationSuspicion               (0-1)
integrityCoeff = deviceIntegrityScore           (0-1)

finalScore = 100 * (
  0.5 * (1 - locationCoeff) +      // 50% weight
  0.3 * (1 - mockCoeff) +          // 30% weight
  0.2 * (1 - integrityCoeff)       // 20% weight
)

Result:
├─ score >= 80: approved ✅
├─ 50 <= score < 80: flagged ⚠️
└─ score < 50: rejected ❌
```

---

## 🛠️ Development Tips

### Modifying Shared Types
1. Edit `packages/shared/src/`
2. Run `pnpm build:shared`
3. Or run `pnpm dev:shared` for watch mode

### Adding New API Endpoint
1. Create DTO in `src/<domain>/dto/`
2. Add service method in `<domain>.service.ts`
3. Add controller method with `@UseGuards`, `@Roles`
4. Update shared types if needed
5. Implement client-side call

### Database Migration
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Update TypeScript models

### Testing

```bash
# Backend tests
cd server/attendance
pnpm test                    # Run tests
pnpm test:watch             # Watch mode
pnpm test:e2e               # E2E tests
```

---

## 📚 Shared Types Usage

### Import in Backend
```typescript
import {
  ApiResponse,
  CheckInRequestPayload,
  LocationPayload,
  Role,
  AttendanceSessionErrorCode,
} from '@gps-attendance/shared';
```

### Import in Mobile Client
```typescript
import { ApiResponse, CheckInRequestPayload } from '@gps-attendance/shared';
```

### Import in Admin Dashboard
```typescript
import { Role, User, AttendanceSession } from '@gps-attendance/shared';
```

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Cannot find '@gps-attendance/shared' | Run `pnpm install` and `pnpm build:shared` |
| Mobile can't connect to backend | Check `EXPO_PUBLIC_API_URL` env var |
| Mock location detection not working | Use real device; iOS has limited detection |
| Database connection failed | Check `DATABASE_URL` env var, start PostgreSQL |
| Location services not working | Enable GPS permission on device |
| Type errors in shared imports | Rebuild: `pnpm build:shared` |

---

## 🔗 Important Links & Files

### Documentation
- [Full System Overview](SYSTEM_OVERVIEW.md)
- [API Response Format](conventions/api-response.md)
- [Auth & Guards](conventions/auth-guards.md)
- [Module Structure](conventions/module-structure.md)
- [Naming Conventions](conventions/naming.md)

### Key Source Files
- Backend root: `server/attendance/src/app.module.ts`
- Shared types: `packages/shared/src/index.ts`
- Mobile entry: `client/mobile-client/src/app/index.tsx`
- Admin entry: `client/admin-dashboard/src/App.tsx`
- Database schema: `server/attendance/prisma/schema.prisma`

### External Resources
- NestJS: https://docs.nestjs.com
- Expo: https://docs.expo.dev
- React: https://react.dev
- Prisma: https://www.prisma.io/docs
- TypeScript: https://www.typescriptlang.org/docs

---

## 🎯 Session Status Lifecycle

```
Creation
  ↓
PENDING (before openAt time)
  ↓
OPEN (between openAt and closeAt)
  ✅ Students can check-in during this period
  ↓
CLOSED (after closeAt time)
  ❌ No more check-ins allowed
```

---

## 📊 Roles & Permissions

| Action | Student | Lecturer | Admin |
|--------|---------|----------|-------|
| Check-in | ✅ | ❌ | ❌ |
| Create session | ❌ | ✅ | ✅ |
| View attendance | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| View dashboard | ❌ | ✅ | ✅ |

---

## 💡 Key Concepts

### User vs Account
- **Account**: Login credentials (username + password)
- **User**: Profile data (name, role, code)
- Relationship: Account (1) ↔ (1) User

### Session Coordinates
- **Latitude/Longitude**: Session center location (decimal degrees)
- **Radius**: Allowed check-in distance in meters
- **Example**: Center at (10.7769, 106.6981), radius 50m

### Validation Coefficients
- Range: 0.0 to 1.0
- 0.0 = Perfect (inside radius, not mocked, legit device)
- 1.0 = Suspicious (far outside, mocked, suspicious device)

### Location Accuracy
- GPS accuracy from device in meters
- Lower is better (±5m is ideal)
- Used in scoring algorithm weight

---

## 🚀 Deployment Checklist

### Backend
- [ ] Database created and migrated
- [ ] Environment variables set (.env)
- [ ] JWT_SECRET configured
- [ ] CORS_ORIGIN configured
- [ ] Build: `pnpm build:attendance`
- [ ] Run: `node dist/main.js`

### Mobile
- [ ] EXPO_PUBLIC_API_URL set
- [ ] Build with Expo CLI or EAS
- [ ] Test on real device
- [ ] Submit to App Store / Google Play

### Admin Dashboard
- [ ] VITE_API_URL configured
- [ ] Build: `pnpm build:admin`
- [ ] Deploy `dist/` folder to hosting
- [ ] Configure CORS on backend

---

## 📞 Support & Resources

For more detailed information:
1. Read [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
2. Check `docs/conventions/` for specific topics
3. Review `src/` files for implementation examples
4. Search for similar features in codebase

**Document Version**: 1.0  
**Last Updated**: 2025-09-03
