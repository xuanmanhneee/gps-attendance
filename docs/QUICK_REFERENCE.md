# GPS Attendance System - Quick Reference Guide

## 🚀 Quick Start

### Installation
```bash
git clone <repo-url>
cd gps-attendance
pnpm install
pnpm build:shared
```

### Run Projects
```bash
# Terminal 1: Backend
pnpm dev:attendance        # http://localhost:3000

# Terminal 2: Mobile
pnpm dev:mobile            # Scan QR code with Expo Go

# Terminal 3: Admin Dashboard
pnpm dev:admin             # http://localhost:5173

# Terminal 4: Watch shared types (if modifying)
pnpm dev:shared
```

---

## 📁 Project Structure

```
gps-attendance/
├── server/attendance/          ← NestJS Backend API
├── client/mobile-client/       ← Expo App (iOS/Android)
├── client/admin-dashboard/     ← React Web Dashboard
├── packages/shared/            ← Shared TypeScript Types
├── docs/conventions/           ← Code conventions
└── docs/SYSTEM_OVERVIEW.md     ← Full documentation (this file)
```

---

## 🏗️ Architecture Layers

### Backend Modules

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **auth** | JWT authentication | auth.service, jwt.strategy |
| **users** | User management | users.service, user.model |
| **attendance-sessions** | Session CRUD | controller, service |
| **attendance-check-in** | Check-in processing | controller, service |
| **attendance-validation** | Anti-fraud scoring | validation.service, checks/ |
| **geo** | Distance calculations | geo.service (Haversine) |
| **attendance-record** | Storage | record.model, repository |

### Database

**Primary Tables**:
- `Account` - Login credentials
- `User` - User profile (links to Account)
- `AttendanceSession` - Sessions with GPS coordinates
- `AttendanceRecord` - Check-in records with validation results

---

## 🔐 Authentication Flow

```
Client                          Server
  │                               │
  ├─ POST /auth/login ─────────→  │
  │  (username, password)          │
  │                                ├─ Verify Account
  │  ← JWT Token ──────────────── │
  │                                │
  ├─ GET /api/resource ─────────→  │
  │  Authorization: Bearer <JWT>   │
  │                                ├─ JwtAuthGuard validates
  │                                ├─ @CurrentUser() extracts userId
  │  ← API Response ──────────── │
```

**Key Points**:
- JWT payload contains `userId` (from User.id, not Account.id)
- Token stored in secure storage on mobile
- `JwtAuthGuard` + `RolesGuard` protect routes
- Roles: `student`, `lecturer`, `admin`

---

## 📍 Check-In Process

```
Student (Mobile App)
  ↓
1. Request GPS location
2. Get device fingerprint
3. Check mock location flag
  ↓
4. POST /attendance/check-in {
     sessionId, location, device, integrity
   }
  ↓
Server (NestJS)
  ↓
5. Validate session is open
6. Run 3 validation checks in parallel:
   a) Location: Within radius? (Haversine formula)
   b) Mock Location: Detected? (system flag + provider type)
   c) Integrity: Device legitimate? (fingerprint, emulator)
  ↓
7. Calculate composite score (0-100):
   - 80+ = ✅ Approved
   - 50-79 = ⚠️ Flagged
   - <50 = ❌ Rejected
  ↓
8. Create AttendanceRecord with status & score
  ↓
Mobile App
  ↓
Display result to student
```

---

## 🛡️ Anti-Fraud Mechanisms

### 1. Location Check
```typescript
// Haversine formula: distance between two GPS points
distance = GeoService.getDistanceInMeters(lat1, lon1, lat2, lon2)
withinRadius = distance <= session.radius

// Coefficient: 0 (inside) to 1 (outside)
coefficient = Math.min(1, distance / radiusLimit)
```

### 2. Mock Location Detection
- **Android**: Check `isLocationMocked` system flag
- **Fallback**: Analyze location provider type (GPS vs network)
- **Supplementary**: Detect impossible movement speeds

### 3. Device Integrity
- Device fingerprinting (ID, model, OS version)
- Emulator/simulator detection
- Device sharing pattern analysis

---

## 🔌 API Endpoints Summary

### Authentication
```
POST   /auth/login                (❌ auth required)
POST   /auth/logout               (✅ JWT required)
POST   /auth/refresh              (✅ JWT required)
```

### Users
```
GET    /users/me                  (✅ JWT required, any role)
GET    /users/:id                 (✅ JWT required, any role)
GET    /users                     (✅ JWT required, admin only)
POST   /users                     (✅ JWT required, admin only)
```

### Sessions (Lecturer/Admin Create)
```
POST   /attendance-sessions       (✅ JWT required, lecturer/admin)
GET    /attendance-sessions       (✅ JWT required, any role)
GET    /attendance-sessions/:id   (✅ JWT required, any role)
PUT    /attendance-sessions/:id   (✅ JWT required, lecturer/admin)
DELETE /attendance-sessions/:id   (✅ JWT required, lecturer/admin)
```

### Check-In (Student Only)
```
POST   /attendance/check-in       (✅ JWT required, student)
```

### Records (Lecturer/Admin View)
```
GET    /attendance-records        (✅ JWT required, lecturer/admin)
GET    /attendance-records/:id    (✅ JWT required, lecturer/admin)
```

---

## 📤 API Response Format

**Success**:
```json
{
  "success": true,
  "data": { /* actual data */ }
}
```

**Error**:
```json
{
  "success": false,
  "code": "ERROR_CODE_HERE",
  "message": "Human readable message"
}
```

**Type Safety** (TypeScript):
```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; code: string; message: string };

// Usage
const response: ApiResponse<SessionData> = await http.post(...)
if (response.success) {
  console.log(response.data.title)  // Type-safe access
}
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
