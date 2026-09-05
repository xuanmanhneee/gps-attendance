# GPS Attendance System - Architecture & Data Flow Reference

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                  │
├────────────────────┬──────────────────────┬──────────────────────────────┤
│                    │                      │                              │
│  Expo Mobile App   │  React Web App       │  Third-party Services       │
│  (iOS/Android)     │  (Admin Dashboard)   │  (Optional)                 │
│                    │                      │  - Maps API                 │
│  React Native      │  React 19            │  - Push Notifications      │
│  Expo SDK 54       │  Vite                │  - Analytics               │
│                    │                      │                              │
│  Pages:            │  Pages:              │                              │
│  - Login           │  - Login             │                              │
│  - Sessions        │  - Dashboard         │                              │
│  - Check-in        │  - Attendance        │                              │
│  - History         │  - Reports           │                              │
│                    │                      │                              │
└─────┬──────────────┴──────────┬───────────┴──────────────────────────────┘
      │                        │
      │ REST API + JWT         │ REST API + JWT
      │ (HTTP/HTTPS)           │ (HTTP/HTTPS)
      │                        │
┌─────▼──────────────────────────▼──────────────────────────────────────────┐
│                         API GATEWAY & VALIDATION                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ • CORS handling                                                    │  │
│  │ • Request validation (class-validator)                            │  │
│  │ • Rate limiting (optional)                                        │  │
│  │ • Error handling & formatting                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└─────┬───────────────────────────────────────────────────────────────────┬─┘
      │                                                                   │
┌─────▼────────────────────────────────────────────────────────────────────▼─┐
│                    NESTJS APPLICATION LAYER                                │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │              │  │              │  │              │  │              │ │
│  │  AuthModule  │  │  UsersModule │  │ AccountModule│  │    GeoModule │ │
│  │              │  │              │  │              │  │              │ │
│  │ • JWT auth   │  │ • User CRUD  │  │ • Login      │  │ • Haversine  │ │
│  │ • Strategies │  │ • Roles      │  │ • Accounts   │  │ • Distance   │ │
│  │ • Guards     │  │ • Filtering  │  │ • Password   │  │ • Radius     │ │
│  │              │  │              │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                            │
│  ┌────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │                                │  │                               │  │
│  │ AttendanceSessionsModule       │  │AttendanceCheckInModule        │  │
│  │                                │  │                               │  │
│  │ • Create session               │  │ • Check-in endpoint           │  │
│  │ • List sessions                │  │ • Validation orchestration    │  │
│  │ • Get session details          │  │ • Record creation             │  │
│  │ • Update/Delete session        │  │                               │  │
│  │ • Status management            │  │ Input: Location + Device      │  │
│  │                                │  │ Output: Validation result     │  │
│  └────────────────────────────────┘  └───────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │       AttendanceValidationModule (Anti-Fraud Engine)            │   │
│  │                                                                  │   │
│  │  ┌────────────────┐  ┌─────────────────┐  ┌────────────────┐  │   │
│  │  │                │  │                 │  │                │  │   │
│  │  │ LocationCheck  │  │ MockLocationCheck│  │ IntegrityCheck │  │   │
│  │  │                │  │                 │  │                │  │   │
│  │  │ • Distance     │  │ • System flags  │  │ • Fingerprint  │  │   │
│  │  │ • Radius match │  │ • Provider type │  │ • Emulator det │  │   │
│  │  │ • GPS accuracy │  │ • Movement speed│  │ • Device share │  │   │
│  │  │                │  │                 │  │                │  │   │
│  │  └────────┬───────┘  └────────┬────────┘  └────────┬───────┘  │   │
│  │           │                   │                    │          │   │
│  │           └───────────────┬───┴────────────────────┘          │   │
│  │                           │                                    │   │
│  │                 ┌─────────▼────────┐                          │   │
│  │                 │  Score Calculator │                          │   │
│  │                 │  (Weighted combo) │                          │   │
│  │                 │   Score 0-100     │                          │   │
│  │                 │   Status result   │                          │   │
│  │                 └──────────────────┘                           │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ AttendanceRecordModule                                           │   │
│  │ • Storage of check-in records                                    │   │
│  │ • Querying attendance history                                    │   │
│  │ • Reporting interface                                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────┬──────────────────────────────────────────────────────────────────────┬┘
     │                                                                      │
┌────▼──────────────────────────────────────────────────────────────────────▼─┐
│                    DATA ACCESS LAYER (Repository Pattern)                    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Prisma Client (ORM)                                                │  │
│  │  • Automatic schema synchronization                                │  │
│  │  • Type-safe query builder                                         │  │
│  │  • Migration management                                            │  │
│  │  • Connection pooling                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└────┬──────────────────────────────────────────────────────────────────────┬─┘
     │                                                                      │
┌────▼──────────────────────────────────────────────────────────────────────▼─┐
│                      PERSISTENCE LAYER (PostgreSQL)                         │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │              │  │              │  │              │  │              │  │
│  │ Account      │  │ User         │  │ AttendanceS… │  │ AttendanceR… │  │
│  │              │  │              │  │              │  │              │  │
│  │ • id         │  │ • id         │  │ • id         │  │ • id         │  │
│  │ • username   │  │ • accountId  │  │ • title      │  │ • userId     │  │
│  │ • password   │  │ • code       │  │ • lat/lon    │  │ • sessionId  │  │
│  │              │  │ • role       │  │ • radius     │  │ • checkedInAt│  │
│  │              │  │ • name       │  │ • openAt     │  │ • status     │  │
│  │              │  │              │  │ • closeAt    │  │ • score      │  │
│  │              │  │              │  │ • status     │  │ • distance   │  │
│  │              │  │              │  │ • createdBy  │  │ • deviceId   │  │
│  │              │  │              │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                              │
│  Relationships:                                                             │
│  • Account (1) ←FK→ (1) User                                               │
│  • User (1) ←FK→ (N) AttendanceSession (createdBy)                        │
│  • AttendanceSession (1) ←FK→ (N) AttendanceRecord                        │
│  • User (1) ←FK→ (N) AttendanceRecord (userId)                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Check-In Data Flow (Detailed Sequence)

```
Mobile App                    Backend API               Database
    │                              │                        │
    │ 1. User taps "Check-in"      │                        │
    │    (GUI state update)        │                        │
    ├─→ Request GPS permission    │                        │
    │    (OS-level)               │                        │
    │                              │                        │
    ├─→ Get GPS location          │                        │
    │    (latitude, longitude)     │                        │
    │                              │                        │
    ├─→ Get device info           │                        │
    │    (model, OS, app version)  │                        │
    │                              │                        │
    ├─→ Check location spoofing    │                        │
    │    (isLocationMocked flag)   │                        │
    │                              │                        │
    │ 2. Build CheckInRequest      │                        │
    │    {                         │                        │
    │      sessionId,              │                        │
    │      location: {...},        │                        │
    │      device: {...},          │                        │
    │      integrity: {...}        │                        │
    │    }                         │                        │
    │                              │                        │
    │ 3. POST /attendance/check-in │                        │
    ├─────────────────────────────→│                        │
    │    (with JWT header)         │                        │
    │                              │                        │
    │                              │ 4. JwtAuthGuard        │
    │                              │    validates token     │
    │                              │                        │
    │                              │ 5. Extract userId     │
    │                              │    from JWT payload    │
    │                              │                        │
    │                              │ 6. Query session       │
    │                              ├───────────────────────→│
    │                              │   SELECT * FROM        │
    │                              │   AttendanceSession    │
    │                              │   WHERE id = ?         │
    │                              │←───────────────────────┤
    │                              │   (session data)       │
    │                              │                        │
    │                              │ 7. Validate session    │
    │                              │    is OPEN             │
    │                              │    (now >= openAt      │
    │                              │     AND now <= closeAt)│
    │                              │                        │
    │                              │ 8. PARALLEL: Run       │
    │                              │    validation checks   │
    │                              │                        │
    │                              │    ┌─ Location Check   │
    │                              │    │  distance =       │
    │                              │    │  Haversine(...)   │
    │                              │    │  coeff = min(1,   │
    │                              │    │    dist/radius)   │
    │                              │    │                   │
    │                              │    ├─ Mock Location    │
    │                              │    │  Check            │
    │                              │    │  • isLocationMock│
    │                              │    │  • providerType  │
    │                              │    │  • speedCheck    │
    │                              │    │                   │
    │                              │    └─ Integrity Check  │
    │                              │       • deviceId match │
    │                              │       • emulator check │
    │                              │       • fingerprint    │
    │                              │                        │
    │                              │ 9. Calculate          │
    │                              │    weighted score:     │
    │                              │    score = 100 * (     │
    │                              │      0.5 * (1-locCoef) │
    │                              │      0.3 * (1-mockCoef)│
    │                              │      0.2 * (1-intCoef) │
    │                              │    )                   │
    │                              │                        │
    │                              │ 10. Determine status:  │
    │                              │     if score >= 80     │
    │                              │       → "approved"     │
    │                              │     elif score >= 50   │
    │                              │       → "flagged"      │
    │                              │     else               │
    │                              │       → "rejected"     │
    │                              │                        │
    │                              │ 11. Create record      │
    │                              ├───────────────────────→│
    │                              │  INSERT INTO           │
    │                              │  AttendanceRecord {    │
    │                              │    userId,             │
    │                              │    sessionId,          │
    │                              │    checkedInAt: now(),  │
    │                              │    validationStatus,   │
    │                              │    validationScore,    │
    │                              │    distance,           │
    │                              │    deviceId            │
    │                              │  }                     │
    │                              │←───────────────────────┤
    │                              │   (inserted record id) │
    │                              │                        │
    │ 12. Response received        │                        │
    ←─────────────────────────────┤                        │
    │    {                         │                        │
    │      success: true,          │                        │
    │      data: {                 │                        │
    │        record: {...},        │                        │
    │        validation: {...}     │                        │
    │      }                        │                        │
    │    }                         │                        │
    │                              │                        │
    │ 13. Display result to user   │                        │
    ├─→ "✅ Điểm danh thành công" │                        │
    │    or warning/error message │                        │
    │                              │                        │
```

---

## 🔐 Authentication & JWT Flow

```
Step 1: Login
┌──────────────┐
│ Mobile/Admin │
└────┬─────────┘
     │ POST /auth/login
     │ { username, password }
     │
     ▼
┌──────────────────────────┐
│  AuthService.login()     │
│  • Hash password         │
│  • Compare with DB       │
│  • Validate credentials  │
└────┬─────────────────────┘
     │ Found → Generate JWT
     │ payload: {
     │   userId: 5,
     │   role: 'student',
     │   iat: 1234567890,
     │   exp: 1234654290
     │ }
     │
     ▼
┌──────────────────────────┐
│  Return JWT Token        │
│  "eyJhbGciOiJIUzI1NiIs" │
└────┬─────────────────────┘
     │
     ▼
┌──────────────┐
│ Client store │ (secure storage on mobile)
│ token        │
└──────────────┘

Step 2: Authenticated Request
┌──────────────────────────────┐
│ GET /users/me                │
│ Authorization:               │
│   Bearer eyJhbGciOiJIUzI1NiIs│
└────┬─────────────────────────┘
     │
     ▼
┌────────────────────────────┐
│ JwtAuthGuard               │
│ • Extract token from header│
│ • Verify signature         │
│ • Check expiration         │
│ • Decode payload           │
└────┬───────────────────────┘
     │ Valid
     │ Extract: userId, role, ...
     │
     ▼
┌──────────────────────────┐
│ @CurrentUser() decorator │
│ Returns: { userId, role }│
└────┬─────────────────────┘
     │
     ▼
┌────────────────────┐
│ Route handler      │
│ can access user    │
│ context            │
└────────────────────┘

Step 3: Permission Checks
If route protected by @Roles('lecturer', 'admin'):
┌─────────────────────────────────┐
│ RolesGuard                       │
│ • Extract user role from token  │
│ • Check against @Roles() array  │
│ • Allow or reject               │
└─────────────────────────────────┘
```

---

## 🛡️ Validation Scoring Deep Dive

### Location Check Algorithm

```
Input:
  user_location = (lat_user, lon_user)
  session_location = (lat_session, lon_session)
  session_radius = 50 meters

Calculate:
  distance = Haversine(
    (lat_user, lon_user),
    (lat_session, lon_session)
  )
  // Returns distance in meters

  locationCoefficient = min(1.0, distance / radiusLimit)
  
  Examples:
  ├─ distance = 10m, radius = 50m
  │  → coeff = 10/50 = 0.2 (inside, low coefficient)
  ├─ distance = 50m, radius = 50m
  │  → coeff = 50/50 = 1.0 (on boundary)
  └─ distance = 100m, radius = 50m
     → coeff = 100/50 = 1.0 (capped at 1.0, far outside)

Haversine Formula:
  Δlat = lat2 - lat1
  Δlon = lon2 - lon1
  a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
  c = 2 × atan2(√a, √(1-a))
  distance = R × c
  
  Where R = 6,371,000 meters (Earth's mean radius)
```

### Mock Location Check Algorithm

```
Input:
  isLocationMocked: boolean      (from Android system)
  locationProvider: string       ('gps' | 'network' | 'fused')
  previousLocation: {lat, lon, time}
  currentLocation: {lat, lon, time}

Calculate:
  suspicionScore = 0.0
  
  if (isLocationMocked == true):
    suspicionScore += 0.8  // Strong signal
  
  if (locationProvider != 'gps'):
    suspicionScore += 0.3  // Network-only locations less reliable
  
  // Impossible movement check
  distance = Haversine(previousLocation, currentLocation)
  timeDelta = currentLocation.time - previousLocation.time
  requiredTime = distance / (maxHumanSpeed = 10 m/s)
  
  if (timeDelta < requiredTime * 0.8):
    suspicionScore += 0.7  // Physically impossible
  
  mockLocationCoefficient = min(1.0, suspicionScore)

Examples:
  ├─ isLocationMocked=false, provider=gps, normal movement
  │  → coeff = 0.0 (clean)
  ├─ isLocationMocked=true, provider=network, 100km in 1 sec
  │  → coeff = 1.0 (highly suspicious)
  └─ provider=network, normal movement
     → coeff = 0.3 (slightly suspicious)
```

### Integrity Check Algorithm

```
Input:
  deviceFingerprint = {
    deviceId: string,
    deviceModel: string,
    osVersion: string,
    appVersion: string
  }
  isEmulator: boolean
  isLocationMocked: boolean

Calculate:
  integrityScore = 0.0
  
  // Device sharing detection
  SELECT COUNT(DISTINCT user_id)
  FROM AttendanceRecord
  WHERE device_id = currentDevice.deviceId
    AND checked_in_at > NOW() - INTERVAL '1 hour'
  
  if (distinctUserCount > 1):
    integrityScore += 0.7  // Same device, multiple users
  
  if (isEmulator == true):
    integrityScore += 0.6  // Emulator running
  
  if (osVersion < minimumOS):
    integrityScore += 0.2  // Outdated OS
  
  if (appVersion < minimumAppVersion):
    integrityScore += 0.2  // Outdated app
  
  integrityCoefficient = min(1.0, integrityScore)

Examples:
  ├─ Real device, single user, recent app, normal OS
  │  → coeff = 0.0 (legitimate)
  ├─ Device shared by 3 users in last hour
  │  → coeff = 0.7 (suspicious)
  └─ Emulator + old app + multiple users
     → coeff = 1.0 (very suspicious)
```

### Final Score Calculation

```
locationCoeff = 0.2       (inside radius)
mockLocationCoeff = 0.0   (no mock, GPS, normal movement)
integrityCoeff = 0.1      (legit device, single user)

Weighted Score:
  score = 100 × (
    0.5 × (1 - locationCoeff) +
    0.3 × (1 - mockLocationCoeff) +
    0.2 × (1 - integrityCoeff)
  )
  
  score = 100 × (
    0.5 × (1 - 0.2) +
    0.3 × (1 - 0.0) +
    0.2 × (1 - 0.1)
  )
  
  score = 100 × (
    0.5 × 0.8 +
    0.3 × 1.0 +
    0.2 × 0.9
  )
  
  score = 100 × (0.4 + 0.3 + 0.18)
  score = 100 × 0.88
  score = 88

Result Decision:
  score >= 80  →  ✅ APPROVED
  (88 >= 80)

Final Status: "APPROVED" (approved)
```

---

## 📊 Data Models & Relationships

### Relationship Diagram

```
┌─────────────┐         1:1         ┌──────────────┐
│   Account   ├────────────────────┤    User      │
├─────────────┤                     ├──────────────┤
│ id (PK)     │                     │ id (PK)      │
│ username    │                     │ accountId(FK)│
│ password    │                     │ code         │
│ created_at  │                     │ role         │
│             │                     │ name         │
└─────────────┘                     │ created_at   │
                                    └──────┬───────┘
                                           │
                              1:N (createdBy)
                                           │
                    ┌──────────────────────┘
                    │
                    │
         ┌──────────▼──────────┐
         │ AttendanceSession   │
         ├─────────────────────┤
         │ id (PK)             │
         │ title               │
         │ latitude            │
         │ longitude           │
         │ radius              │
         │ openAt              │
         │ closeAt             │
         │ status              │
         │ createdBy (FK User) │
         │ created_at          │
         └──────────┬──────────┘
                    │
                    │ 1:N
                    │
         ┌──────────▼────────────────┐
         │ AttendanceRecord          │
         ├───────────────────────────┤
         │ id (PK)                   │
         │ userId (FK User)          │
         │ sessionId (FK Session)    │
         │ checkedInAt               │
         │ validationStatus          │
         │ validationScore           │
         │ locationAccuracy          │
         │ distance                  │
         │ deviceId                  │
         │ notes                     │
         │ created_at                │
         └───────────────────────────┘

User can participate in multiple sessions
Each session can have multiple check-in records
Each user can have multiple check-in records (one per session)
```

### SQL Relationship Queries

```sql
-- Find all sessions created by a lecturer
SELECT s.* FROM AttendanceSession s
JOIN "User" u ON s.created_by = u.id
WHERE u.id = 3 AND u.role = 'lecturer'
ORDER BY s.open_at DESC;

-- Find attendance records for a session with user details
SELECT r.*, u.name, u.code
FROM AttendanceRecord r
JOIN "User" u ON r.user_id = u.id
WHERE r.session_id = 1
ORDER BY r.checked_in_at;

-- Find flagged/suspicious check-ins
SELECT r.*, u.name, u.code, s.title
FROM AttendanceRecord r
JOIN "User" u ON r.user_id = u.id
JOIN AttendanceSession s ON r.session_id = s.id
WHERE r.validation_status = 'flagged'
  AND r.validation_score < 70
ORDER BY r.validation_score ASC;

-- Find device sharing patterns
SELECT device_id, COUNT(DISTINCT user_id) as user_count,
       STRING_AGG(DISTINCT u.name, ', ') as users
FROM AttendanceRecord r
JOIN "User" u ON r.user_id = u.id
WHERE r.checked_in_at > NOW() - INTERVAL '24 hours'
GROUP BY device_id
HAVING COUNT(DISTINCT user_id) > 1
ORDER BY user_count DESC;

-- Attendance rate per session
SELECT s.title, s.id,
       COUNT(DISTINCT r.user_id) as attended,
       COUNT(*) as total_records
FROM AttendanceSession s
LEFT JOIN AttendanceRecord r ON s.id = r.session_id
  AND r.validation_status = 'approved'
WHERE s.status = 'closed'
GROUP BY s.id, s.title
ORDER BY s.close_at DESC;
```

---

## 🔄 Module Dependencies

```
┌─────────────────┐
│   AppModule     │ (Imports all other modules)
└────────────────────────────────────┐
                                     │
         ┌───────┬───────┬───────────┼─────────┐
         │       │       │           │         │
         ▼       ▼       ▼           ▼         ▼
    ┌────────┐ ┌──────┐ ┌──────┐ ┌─────┐ ┌──────┐
    │ Config │ │ Auth │ │Users │ │ Geo │ │Common│
    │Module  │ │Module│ │Module│ │Module│ │Module│
    └────────┘ └──┬───┘ └──────┘ └─────┘ └──────┘
                  │
                  │ (exports JwtStrategy globally)
         ┌────────┘
         │
         ▼
    ┌──────────────────────┐
    │AttendanceSessionsModule│
    │ (uses JwtAuthGuard)  │
    └──────────────────────┘
         │
         │ (imports GeoModule)
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
    ┌──────────────────┐        ┌──────────────────────────┐
    │AttendanceCheckInModule    │AttendanceValidationModule│
    │ • checkIn endpoint        │ • validation checks      │
    │ • uses JwtAuthGuard       │ • scoring logic          │
    │ • imports validation      │ • integrates with Geo   │
    └──────────────────┘        └──────────────────────────┘
         │                                 │
         │ (creates records via)           │
         │                                 │
         └────────────────┬────────────────┘
                          │
                          ▼
                   ┌──────────────────┐
                   │AttendanceRecord  │
                   │Module            │
                   │ • Persistence    │
                   └──────────────────┘
                          │
                          │ (uses Prisma)
                          ▼
                   ┌──────────────────┐
                   │ PostgreSQL       │
                   │ Database         │
                   └──────────────────┘
```

---

## 🔗 Monorepo Workspace Structure

```
gps-attendance/ (root)
│
├── pnpm-workspace.yaml
│   defines workspace members:
│   - 'server/**'
│   - 'client/**'
│   - 'packages/**'
│
├── pnpm-lock.yaml
│   single lock file for all workspace packages
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── api/
│       │   │   └── response/
│       │   │       └── error_codes/
│       │   │           └── *.error-codes.ts
│       │   └── types/
│       ├── dist/  (built output)
│       ├── package.json
│       │   name: "@gps-attendance/shared"
│       └── tsconfig.json
│
├── server/
│   └── attendance/
│       ├── src/
│       │   ├── app.module.ts (root)
│       │   ├── auth/
│       │   ├── users/
│       │   ├── attendance-sessions/
│       │   ├── attendance-check-in/
│       │   ├── attendance-validation/
│       │   ├── geo/
│       │   ├── common/
│       │   └── generated/  (Prisma client)
│       ├── dist/  (built output)
│       ├── package.json
│       │   name: "@gps-attendance/attendance"
│       │   dependencies:
│       │     "@gps-attendance/shared": "workspace:*"
│       └── prisma/
│
├── client/
│   ├── mobile-client/
│   │   ├── src/
│   │   │   ├── app/     (Expo Router screens)
│   │   │   ├── components/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   └── constants/
│   │   ├── package.json
│   │   │   name: "@gps-attendance/mobile-client"
│   │   │   dependencies:
│   │   │     "@gps-attendance/shared": "workspace:*"
│   │   └── app.json  (Expo config)
│   │
│   └── admin-dashboard/
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── App.tsx
│       ├── dist/  (Vite output)
│       ├── package.json
│       │   name: "@gps-attendance/admin-dashboard"
│       │   dependencies:
│       │     "@gps-attendance/shared": "workspace:*"
│       └── vite.config.ts
│
├── docs/
│   ├── conventions/     (code standards)
│   ├── SYSTEM_OVERVIEW.md
│   └── QUICK_REFERENCE.md
│
└── root package.json
    scripts:
      dev:attendance    → pnpm --filter @gps-attendance/attendance dev
      dev:mobile        → pnpm --filter @gps-attendance/mobile-client dev
      dev:admin         → pnpm --filter @gps-attendance/admin-dashboard dev
      build:shared      → pnpm --filter @gps-attendance/shared build
```

### Workspace Link Mechanism

```
When running pnpm install at root:

1. pnpm reads pnpm-workspace.yaml
2. Resolves all member packages
3. Creates symlinks in node_modules:
   
   node_modules/
   ├── @gps-attendance/
   │   ├── shared/ → ../../packages/shared (symlink)
   │   ├── attendance/ → ../../server/attendance (symlink)
   │   ├── mobile-client/ → ../../client/mobile-client (symlink)
   │   └── admin-dashboard/ → ../../client/admin-dashboard (symlink)
   
4. All packages can import from each other:
   
   // In backend
   import { ApiResponse } from '@gps-attendance/shared'
   
   // In mobile
   import { LocationPayload } from '@gps-attendance/shared'

5. Changes to workspace:* dependencies:
   - Always use current source (not published versions)
   - No versioning needed for internal dependencies
```

---

## 🚀 Build & Watch Process

```
Command: pnpm dev:attendance

1. Execute predev hook:
   pnpm build:shared  (compile TypeScript → dist/)

2. Start server in watch mode:
   nest start --watch
   
   Watches:
   ├─ src/**/*.ts
   ├─ Changes trigger recompile + reload
   └─ Database migrations NOT auto-applied

3. Server running at http://localhost:3000

4. For changes to packages/shared/:
   pnpm dev:shared  (separate terminal)
   
   Watches:
   ├─ packages/shared/src/**/*.ts
   ├─ Rebuilds dist/ on change
   └─ Server still running, uses new dist/
```

---

## 📋 Type Safety across Workspace

```
Backend Type Usage:

import { ApiResponse, CheckInRequestPayload } from '@gps-attendance/shared'

const checkIn = async (
  dto: CheckInRequestPayload,
  user: AuthenticatedUser
): Promise<ApiResponse<AttendanceRecord>> => {
  // Type-safe DTO validation
  // Return type enforced
}


Mobile/Admin Type Usage:

import { 
  ApiResponse, 
  LocationPayload,
  CheckInRequestPayload 
} from '@gps-attendance/shared'

// Build check-in request
const payload: CheckInRequestPayload = {
  sessionId: 1,
  location: {...} as LocationPayload,
  device: {...},
  integrity: {...}
}

// API call with type-safe response
const response: ApiResponse<ValidationResult> = await http.post(
  '/attendance/check-in',
  payload
)

if (response.success) {
  console.log(response.data.validationScore)  // Type-safe
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-03  
**Purpose**: Technical architecture reference for developers
