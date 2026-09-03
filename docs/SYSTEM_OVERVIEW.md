# GPS Attendance System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Repository Structure](#repository-structure)
5. [Backend System](#backend-system)
6. [Frontend Applications](#frontend-applications)
7. [Shared Packages](#shared-packages)
8. [Key Features & Business Logic](#key-features--business-logic)
9. [Data Models](#data-models)
10. [API Endpoints](#api-endpoints)
11. [Development Workflow](#development-workflow)
12. [Deployment](#deployment)

---

## System Overview

GPS Attendance System is an automated attendance tracking solution for educational institutions. It uses real-time GPS location verification combined with anti-fraud mechanisms to ensure accurate attendance recording while preventing common cheating methods.

### Primary Goals

✅ **Accurate Attendance Tracking**: Students check in via mobile app using actual GPS location  
✅ **Fraud Prevention**: Multi-layered validation to detect and prevent:
- Location spoofing (mock location / fake GPS)
- Device sharing (one device used for multiple accounts)
- Impossible movement patterns  

✅ **Scalability**: Handle thousands of simultaneous check-ins during peak times (class start, events)

✅ **User-Friendly**: Seamless mobile experience for students, web dashboard for instructors

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Clients                            │
│  ┌──────────────────────┬──────────────────────────────────┐ │
│  │   Expo App (iOS)     │     Expo App (Android)           │ │
│  │  (React Native)      │     (React Native)               │ │
│  └──────────────┬───────┴─────────────────────────┬────────┘ │
│                 │                                  │          │
│                 │ REST API + JWT                   │          │
│                 │ (HTTP/HTTPS)                     │          │
└─────────────────┼──────────────────────────────────┼──────────┘
                  │                                  │
┌─────────────────▼──────────────────────────────────▼──────────┐
│                   NestJS Backend Server                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  API Gateway / Request Validation                      │ │
│  └─────┬──────────────────────────────────────────────────┘ │
│        │                                                     │
│  ┌─────▼──────────────────────────────────────────────────┐ │
│  │  Core Modules:                                         │ │
│  │  • Auth (JWT, Account, User)                          │ │
│  │  • Attendance Sessions Management                      │ │
│  │  • Check-In Processing                                │ │
│  │  • Geo Calculations (Distance, Radius)                │ │
│  │  • Attendance Validation (Anti-Fraud)                 │ │
│  │  • Attendance Records Storage                         │ │
│  └─────┬──────────────────────────────────────────────────┘ │
│        │                                                     │
│  ┌─────▼──────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database (Prisma ORM)                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
           │
           │ (Future)
           ▼
┌──────────────────────────────────────────┐
│   Admin Web Dashboard (React + Vite)     │
│   - Session Management                   │
│   - Attendance Reporting                 │
│   - User Management                      │
└──────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Technology |
|-----------|---------|-----------|
| **Mobile Client** | Student attendance check-in | Expo SDK 54, React Native |
| **Backend API** | Session management, validation, records | NestJS, PostgreSQL, Prisma |
| **Admin Dashboard** | Instructor/admin console | React, Vite, TypeScript |
| **Shared Types** | Shared types/DTOs | TypeScript, buildable package |

---

## Technology Stack

### Backend
- **Runtime**: Node.js >= 20
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Passport.js
- **Validation**: class-validator, class-transformer
- **API Documentation**: Swagger/OpenAPI

### Frontend (Mobile)
- **Platform**: iOS & Android via Expo SDK 54
- **Framework**: React Native
- **Routing**: Expo Router
- **State Management**: React Hooks
- **Location Services**: expo-location
- **HTTP Client**: Fetch API

### Frontend (Admin Dashboard)
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: CSS modules / vanilla CSS

### Package Manager & Monorepo
- **Package Manager**: pnpm v11.12.0
- **Workspace**: pnpm workspaces (monorepo)
- **Version Control**: Git

---

## Repository Structure

```
gps-attendance/
├── server/
│   └── attendance/                    # NestJS Backend Server
│       ├── prisma/
│       │   └── schema.prisma          # Database schema
│       ├── src/
│       │   ├── app.module.ts          # Root module
│       │   ├── main.ts                # Entry point
│       │   ├── account/               # Account domain
│       │   ├── auth/                  # Authentication
│       │   ├── users/                 # User management
│       │   ├── attendance-sessions/   # Session CRUD
│       │   ├── attendance-check-in/   # Check-in endpoint
│       │   ├── attendance-record/     # Record storage
│       │   ├── attendance-validation/ # Anti-fraud validation
│       │   ├── geo/                   # GPS calculations
│       │   ├── common/                # Shared utilities
│       │   └── generated/             # Prisma client (auto)
│       ├── test/
│       ├── package.json
│       ├── nest-cli.json
│       └── tsconfig*.json
│
├── client/
│   ├── mobile-client/                 # Expo App (iOS/Android)
│   │   ├── src/
│   │   │   ├── app/                   # Screens (Expo Router)
│   │   │   ├── components/            # Reusable UI components
│   │   │   ├── api/                   # HTTP client & API calls
│   │   │   ├── constants/             # App constants
│   │   │   ├── hooks/                 # Custom React hooks
│   │   │   └── assets/                # Images, icons
│   │   ├── package.json
│   │   └── app.json                   # Expo config
│   │
│   └── admin-dashboard/               # React + Vite Web App
│       ├── src/
│       │   ├── pages/                 # Pages (Login, Dashboard)
│       │   ├── components/            # Components
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/                    # Static assets
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   └── shared/                        # Shared TS Types & DTOs
│       ├── src/
│       │   ├── api/
│       │   │   ├── response/          # ApiResponse format, error codes
│       │   │   ├── auth/              # Auth DTOs
│       │   │   ├── attendance-session/ # Session DTOs
│       │   │   └── fetch-client.ts    # HTTP utilities
│       │   └── types/                 # Domain types
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── conventions/
│   │   ├── api-response.md            # API response format rules
│   │   ├── auth-guards.md             # Auth implementation
│   │   ├── module-structure.md        # Module structure rules
│   │   └── naming.md                  # Naming conventions
│   └── SYSTEM_OVERVIEW.md             # This file
│
├── docker-compose.yml
├── package.json                       # Root workspace config
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
```

---

## Backend System

### Module Architecture

The backend follows NestJS module pattern with dependency injection. Each domain has a dedicated module following the structure defined in `docs/conventions/module-structure.md`.

#### Core Modules

##### 1. **AuthModule** (`src/auth/`)
**Responsibility**: JWT authentication, user account verification

**Components**:
- `auth.service.ts` - Login logic, token generation
- `jwt.strategy.ts` - Passport JWT strategy
- `jwt-auth.guard.ts` - Route protection guard
- `roles.guard.ts` - Role-based access control
- `current-user.decorator.ts` - Extract authenticated user from request

**Key Flows**:
1. User submits username + password → `AuthService.login()`
2. Service validates credentials against `Account` table
3. JWT token generated with `userId` in payload
4. Token returned to client
5. Client includes token in subsequent requests' `Authorization: Bearer <token>` header
6. `JwtAuthGuard` validates token, `@CurrentUser()` extracts user info

**Important Notes**:
- JWT payload contains `userId` (from `User.id`, not `Account.id`)
- `User` and `Account` are separate entities
- `JwtStrategy` registered globally - other modules don't need to import AuthModule
- See `docs/conventions/auth-guards.md` for details

##### 2. **UsersModule** (`src/users/`)
**Responsibility**: User data management (students, lecturers, admins)

**Components**:
- `user.model.ts` - User interface (id, code, role, name, accountId)
- `users.service.ts` - User CRUD operations
- `user.repository.ts` - Interface for data access
- `mock-user.repository.ts` - Mock implementation (for testing/development)
- `user-filter.service.ts` - Query filtering logic

**Data Model**:
```typescript
interface User {
  id: number;
  accountId: number;      // FK to Account
  code: string;           // Student/lecturer code
  role: Role;             // 'student' | 'lecturer' | 'admin'
  name: string;
}
```

**Role Types**: 
- `student` - Can check in to sessions
- `lecturer` - Can create sessions, view attendance
- `admin` - Full system access

##### 3. **AccountModule** (`src/account/`)
**Responsibility**: Login credentials storage (separate from User profile)

**Components**:
- `account.model.ts` - Account interface (id, username, password)
- `account.service.ts` - Account CRUD
- `account.repository.ts` - Data access interface

**Data Model**:
```typescript
interface Account {
  id: number;
  username: string;       // Login username
  password: string;       // Hashed password
}
```

**Relationship**: Account 1-to-1 User (via `User.accountId`)

##### 4. **AttendanceSessionsModule** (`src/attendance-sessions/`)
**Responsibility**: Attendance session lifecycle management

**Components**:
- `attendance-sessions.controller.ts` - HTTP endpoints
- `attendance-sessions.service.ts` - Business logic
- `attendance-session.model.ts` - Data model

**Data Model**:
```typescript
interface AttendanceSession {
  id: number;
  title: string;
  latitude: number;       // Session location (decimal degrees)
  longitude: number;
  radius: number;         // Allowed check-in radius (meters)
  openAt: Date;          // Session opens at this time
  closeAt: Date;         // Session closes at this time
  status: SessionStatus;  // 'pending' | 'open' | 'closed'
  createdBy: number;     // User.id of creator
  createdAt: Date;
  updatedAt: Date;
}
```

**Endpoints**:
- `POST /attendance-sessions` - Create new session (lecturer/admin only)
- `GET /attendance-sessions` - List all sessions
- `GET /attendance-sessions/:id` - Get specific session

**Status Transitions**:
- `pending` → `open` (when openAt time reached)
- `open` → `closed` (when closeAt time reached)
- Servers responsible for status management (client reads only)

##### 5. **AttendanceCheckInModule** (`src/attendance-check-in/`)
**Responsibility**: Process check-in requests from mobile clients

**Components**:
- `attendance-check-in.controller.ts` - HTTP endpoint
- `attendance-check-in.service.ts` - Check-in logic orchestration
- `attendance-check-in.dto.ts` - Request/response validation

**Data Model (Request)**:
```typescript
interface CheckInRequestPayload {
  sessionId: number;
  location: LocationPayload;      // GPS coordinates
  device: DevicePayload;          // Device fingerprint
  integrity: DeviceIntegrityPayload; // Anti-spoofing signals
}

interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number;               // GPS accuracy in meters
  timestamp: number;              // Epoch milliseconds
}

interface DevicePayload {
  deviceId: string;               // Unique device identifier
  deviceModel: string;
  osVersion: string;
  appVersion: string;
}

interface DeviceIntegrityPayload {
  isLocationMocked: boolean;      // System flag for mock location
  isEmulator: boolean;            // Emulator/simulator detection
  locationProvider: string;       // 'gps' | 'network' | 'fused'
}
```

**Endpoint**:
- `POST /attendance/check-in` - Submit attendance check-in

**Flow**:
1. Client sends check-in request with location + device info
2. Server validates session exists and is open
3. Server runs anti-fraud checks (location, mock detection, device)
4. If all checks pass, record created in database
5. Response includes validation result details

##### 6. **AttendanceValidationModule** (`src/attendance-validation/`)
**Responsibility**: Multi-layered fraud detection and scoring

**Components**:
- `attendance-validation.service.ts` - Orchestrates all checks
- `checks/location.check.ts` - Geographic validation
- `checks/mock-location.check.ts` - Mock location detection
- `checks/integrity.check.ts` - Device integrity assessment
- `attendance-validation.types.ts` - Type definitions

**Validation Types**:

**a) Location Check**
- Validates GPS coordinates are within session radius
- Uses Haversine formula (great-circle distance)
- Returns coefficient 0.0-1.0 (0 = inside radius, 1 = outside)

**b) Mock Location Check**
- Detects if device reports being mocked
- Analyzes location provider type
- Detects impossible movement patterns
- Returns coefficient for suspicion level

**c) Integrity Check**
- Device fingerprint analysis
- Detects emulator/simulator
- Checks for device sharing patterns
- Validates app version and security baseline

**Validation Result**:
```typescript
interface ValidationResult {
  status: 'approved' | 'flagged' | 'rejected';
  score: number;              // 0-100 confidence score
  details: {
    location: LocationCheckResult;
    mockLocation: MockLocationCheckResult;
    integrity: IntegrityCheckResult;
  };
}
```

**Scoring Logic**:
- Each check produces a coefficient (0-1)
- Final score = weighted combination of coefficients
- Threshold-based decisions:
  - Score > 80 = approved
  - 50-80 = flagged (recorded but marked suspicious)
  - < 50 = rejected (not recorded)

##### 7. **GeoModule** (`src/geo/`)
**Responsibility**: Geographic calculations for distance and radius checks

**Components**:
- `geo.service.ts` - Distance calculations

**Methods**:
```typescript
getDistanceInMeters(lat1, lon1, lat2, lon2): number
// Returns distance in meters between two coordinates (Haversine formula)

isWithinRadius(centerLat, centerLon, pointLat, pointLon, radiusMeters): boolean
// Checks if a point is within specified radius from center
```

**Implementation Details**:
- Uses Haversine formula (great-circle distance)
- Earth radius: 6,371 km
- Sufficient precision for school-scale distances
- All distances in meters

##### 8. **AttendanceRecordModule** (`src/attendance-record/`)
**Responsibility**: Persistent storage of check-in records

**Components**:
- `attendance-record.model.ts` - Data model
- `attendance-record.service.ts` - CRUD operations

**Data Model**:
```typescript
interface AttendanceRecord {
  id: number;
  userId: number;              // FK to User
  sessionId: number;           // FK to AttendanceSession
  checkedInAt: Date;
  validationStatus: 'approved' | 'flagged' | 'rejected';
  validationScore: number;
  locationAccuracy: number;
  distance: number;            // Distance from session center
  deviceId: string;
  notes?: string;
}
```

---

### Request/Response Format

All API responses follow discriminated union pattern:

```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; code: string; message: string };
```

**Example Success Response**:
```json
{
  "success": true,
  "data": {
    "session": {
      "id": 1,
      "title": "Programming 101 - Day 1",
      "latitude": 10.7769,
      "longitude": 106.6981,
      "radius": 50,
      "openAt": "2025-09-03T08:00:00Z",
      "closeAt": "2025-09-03T09:00:00Z",
      "status": "open",
      "createdBy": 1,
      "createdAt": "2025-09-02T10:00:00Z",
      "updatedAt": "2025-09-03T08:00:00Z"
    }
  }
}
```

**Example Error Response**:
```json
{
  "success": false,
  "code": "ATTENDANCE_SESSION_NOT_FOUND",
  "message": "Attendance session không tồn tại"
}
```

**Error Codes** (defined in `packages/shared/src/api/response/error_codes/`):
- `ACCOUNT_INVALID_CREDENTIALS` - Login failed
- `ATTENDANCE_SESSION_NOT_FOUND` - Session doesn't exist
- `ATTENDANCE_SESSION_NOT_OPEN` - Session not in open status
- `LOCATION_OUTSIDE_RADIUS` - GPS location too far from center
- `MOCK_LOCATION_DETECTED` - Location spoofing detected
- `CHECK_IN_REJECTED` - Validation failed
- etc.

---

## Frontend Applications

### Mobile Client (Expo App)

**Location**: `client/mobile-client/`

**Purpose**: Student attendance check-in via GPS

**Technology**:
- Expo SDK 54 (React Native)
- expo-location for GPS access
- Expo Router for navigation
- TypeScript

**Key Screens**:

1. **Login Screen** (`src/app/index.tsx`)
   - Username + password input
   - Calls `AuthAPI.login()`
   - Stores JWT token in secure storage
   - Navigates to main app on success

2. **Dashboard Screen** (`src/app/explore.tsx`)
   - Lists active/upcoming attendance sessions
   - Shows countdown to session open/close
   - User profile information
   - Check-in button for each session

3. **Check-In Screen**
   - Activates GPS location service
   - Collects device fingerprint
   - Checks device integrity (mock location detection)
   - Submits check-in request to server
   - Shows result (approved/flagged/rejected)

**API Integration** (`src/api/`):
```typescript
// api.ts - Base HTTP client
http.get<T>(path: string)
http.post<T>(path: string, body)

// auth.api.ts - Authentication
AuthAPI.login(username, password)
AuthAPI.logout()

// attendance.api.ts - Check-in operations
AttendanceAPI.checkIn(sessionId, location, device, integrity)
AttendanceAPI.getSessions()
```

**Location Services** (`expo-location`):
- Requests GPS permission from user
- Gets accurate coordinates with accuracy estimate
- Detects if location provider is mocked
- Provides location timestamp

**Device Fingerprinting**:
- Device model and OS version via `expo-device`
- App version via environment
- Unique device ID via native modules or expo-constants
- Anti-emulator detection

---

### Admin Dashboard (React + Vite)

**Location**: `client/admin-dashboard/`

**Purpose**: Instructor/admin console for session management and attendance review

**Technology**:
- React 19
- Vite (build tool)
- TypeScript
- CSS modules

**Key Pages**:

1. **Login Page** (`src/pages/LoginPage.tsx`)
   - Lecturer/admin authentication
   - Similar to mobile app but no location needed

2. **Dashboard Page** (`src/pages/DashboardPage.tsx`)
   - Create attendance session
   - View all sessions
   - View attendance records per session
   - Filter/search attendance data
   - Export reports (future feature)

**Features**:
- Session CRUD (create, edit, delete, list)
- Attendance record viewing
- Filtering by date, session, status
- Real-time session status (pending/open/closed)
- Validation score details for flagged check-ins

**API Integration**:
- Uses shared HTTP client from `packages/shared`
- Same JWT authentication as mobile app
- Different endpoints based on role

---

## Shared Packages

### Shared Types Package (`packages/shared/`)

**Purpose**: Centralized TypeScript types and DTOs shared between server and all clients

**Structure**:
```
packages/shared/src/
├── api/
│   ├── response/
│   │   ├── error_codes/        # Domain error codes
│   │   │   ├── account-error-codes.ts
│   │   │   ├── attendance-session-error-codes.ts
│   │   │   └── ...
│   │   └── index.ts            # ApiResponse type
│   ├── auth/
│   │   └── auth.dto.ts         # Login/token types
│   ├── attendance-session/
│   │   └── index.ts            # Session DTOs
│   ├── fetch-client.ts         # HTTP utilities
│   └── http-client.ts
├── types/
│   ├── index.ts
│   ├── device.types.ts         # Device fingerprint types
│   ├── users/                  # User types
│   ├── attendance/             # Attendance types
│   └── ...
└── index.ts                    # Re-export all
```

**Key Exports**:
```typescript
// Response type
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; code: string; message: string };

// Domains
export type Role = 'student' | 'lecturer' | 'admin';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface CheckInRequestPayload {
  sessionId: number;
  location: LocationPayload;
  device: DevicePayload;
  integrity: DeviceIntegrityPayload;
}

// Error codes
export const AccountErrorCode = {
  INVALID_CREDENTIALS: 'ACCOUNT_INVALID_CREDENTIALS',
  // ...
};
```

**Usage**:
- Backend: `import { ApiResponse, CheckInRequestPayload } from '@gps-attendance/shared'`
- Mobile: `import { LocationPayload } from '@gps-attendance/shared'`
- Admin: `import { Role } from '@gps-attendance/shared'`

**Build & Link**:
- Compiled to `packages/shared/dist/`
- Linked via pnpm workspace
- Server uses compiled `dist/`, mobile/admin use TypeScript sources directly
- When modifying: `pnpm build:shared` or `pnpm dev:shared --watch`

---

## Key Features & Business Logic

### 1. Authentication & Authorization

**Flow**:
1. User enters credentials on login screen
2. Client calls `POST /auth/login` with username + password
3. Server validates against `Account` table
4. If valid, generates JWT with payload: `{ userId, role }`
5. Client stores JWT in secure storage
6. Subsequent requests include: `Authorization: Bearer <token>`
7. Server validates token via `JwtAuthGuard`
8. `@CurrentUser()` decorator extracts user info

**Access Control**:
- `student` - Can only check in to sessions
- `lecturer` - Can create sessions, view attendance
- `admin` - Full system access
- Guards: `JwtAuthGuard` + `RolesGuard`

---

### 2. Attendance Session Lifecycle

**States**:
```
(Creation)
    ↓
 PENDING ─→ OPEN ─→ CLOSED
(before opening time)  (between open/close times)  (after close time)
```

**Key Times**:
- `createdAt` - Session created timestamp
- `openAt` - Time when session becomes available for check-in
- `closeAt` - Deadline for check-in
- `checkedInAt` - When user checked in (stored in record)

**Server Responsibilities**:
- Validate `current_time >= openAt && current_time <= closeAt`
- Prevent check-ins outside this window
- Mark sessions as closed after closeAt automatically

---

### 3. Check-In Process & Anti-Fraud

**Complete Flow**:

```
Mobile App (Student)
    ↓
1. Request GPS permission
2. Get current location + accuracy
3. Get device fingerprint (model, OS, app version)
4. Check mock location flags
5. POST /attendance/check-in with payload
    ↓
Backend (Server)
    ↓
1. Validate JWT token (JwtAuthGuard)
2. Extract userId from token
3. Validate session exists and is open
4. Run parallel validation checks:
   ├─ Location Check
   │  ├─ Verify GPS within session radius
   │  └─ Distance = Haversine(user location, session location)
   │
   ├─ Mock Location Check
   │  ├─ Check device's "isLocationMocked" flag
   │  ├─ Analyze location provider (GPS vs network)
   │  └─ Detect impossible movement patterns
   │
   └─ Integrity Check
      ├─ Device fingerprint analysis
      ├─ Detect emulator/simulator
      ├─ Check device sharing patterns
      └─ Validate app security baseline
5. Calculate composite validation score (0-100)
6. Determine status: approved/flagged/rejected
7. Create AttendanceRecord with status & score
8. Return result to client
    ↓
Mobile App (Student)
    ↓
Display result:
- ✅ Approved: "Điểm danh thành công"
- ⚠️ Flagged: "Điểm danh thành công (cảnh báo: vị trí không chính xác)"
- ❌ Rejected: "Điểm danh không được phép"
```

**Validation Scoring Algorithm**:
```
locationCoeff = (distance / radiusLimit)           // 0-1
mockLocationCoeff = mockLocationSuspicion          // 0-1
integrityCoeff = deviceIntegrityScore              // 0-1

finalScore = 100 * (
  0.5 * (1 - locationCoeff) +
  0.3 * (1 - mockLocationCoeff) +
  0.2 * (1 - integrityCoeff)
)

Result:
- score >= 80 → approved
- 50 <= score < 80 → flagged
- score < 50 → rejected
```

**Key Anti-Fraud Signals**:

| Check | Detects | Confidence |
|-------|---------|-----------|
| **Location Radius** | Out-of-range GPS | Very High |
| **Mock Location** | System flag, provider type | Medium-High |
| **Impossible Movement** | Physically impossible speed | Medium |
| **Device Fingerprint** | Device swapping | Medium |
| **Emulator Detection** | Emulator/simulator | Medium |
| **Location Provider** | Network-only (less accurate) | Low-Medium |

---

### 4. Device Fingerprinting

**Purpose**: Detect if one device is being used for multiple accounts

**Fingerprint Components**:
```typescript
{
  deviceId: string;           // Unique device ID
  deviceModel: string;        // "Pixel 7", "iPhone 14 Pro"
  osVersion: string;          // "14.0", "Android 13"
  appVersion: string;         // "1.0.0"
}
```

**Collection Method**:
- `deviceId` - Generated via native modules or stored in device storage
- `deviceModel`, `osVersion` - From `expo-device` package
- `appVersion` - From app build metadata

**Matching Logic**:
- Server tracks which `userId`s have used each `deviceId`
- Flag if multiple users using same device in short time window
- Escalate to integrity check if pattern detected

---

### 5. Mock Location Detection

**Purpose**: Prevent GPS spoofing (using fake location apps)

**Detection Methods**:

1. **System Flag** (Easiest)
   - Android: `LocationProvider == "mock"` or `isLocationMocked` flag
   - iOS: No built-in API, but `CLLocationManager` behavior differs
   - Reliability: High on Android, Lower on iOS

2. **Provider Type Analysis** (Fallback)
   - GPS is most trustworthy (actual satellite signals)
   - Network/Fused is less trustworthy
   - Weight check if provider is not GPS

3. **Impossible Movement** (Supplementary)
   - Calculate distance between last known location and current location
   - If time gap < calculated time needed at human speed → impossible
   - Example: 10 km apart but only 30 seconds elapsed → flagged

**Implementation**:
- Mobile app queries location provider via `expo-location`
- Includes `isLocationMocked`, `locationProvider` in check-in payload
- Server cross-validates signals

---

### 6. Session Management

**Lecturer/Admin Workflow**:

1. **Create Session**
   ```
   POST /attendance-sessions {
     title: "Programming 101 - Lecture 1",
     latitude: 10.7769,
     longitude: 106.6981,
     radius: 50,              // meters
     openAt: "2025-09-03T08:00:00Z",
     closeAt: "2025-09-03T09:00:00Z"
   }
   ```

2. **View Sessions**
   ```
   GET /attendance-sessions
   → Returns list of all sessions (past, present, future)
   ```

3. **View Attendance**
   ```
   GET /attendance-records?sessionId=1
   → Returns all check-in records with validation scores
   ```

4. **Analyze Flagged Records**
   - Filter records with `status == "flagged"`
   - Review validation score components
   - Manually approve/reject if needed (future feature)

---

## Data Models

### Entity Relationship Diagram

```
Account (1) ──────── (1) User
  id               accountId
  username         id
  password         code
                   role (student|lecturer|admin)
                   name

             User (1) ────────── (N) AttendanceSession
                                    id
                                    createdBy (FK User.id)
                                    title
                                    latitude
                                    longitude
                                    radius
                                    openAt
                                    closeAt
                                    status

        AttendanceSession (1) ────────── (N) AttendanceRecord
                                            id
                                            userId (FK User.id)
                                            sessionId (FK Session.id)
                                            checkedInAt
                                            validationStatus
                                            validationScore
                                            distance
                                            deviceId
```

### Table Schemas

#### Account Table
```sql
CREATE TABLE Account (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### User Table
```sql
CREATE TABLE "User" (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL UNIQUE,
  code VARCHAR(50) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES Account(id)
);
```

#### AttendanceSession Table
```sql
CREATE TABLE AttendanceSession (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,6) NOT NULL,
  longitude DECIMAL(10,6) NOT NULL,
  radius INTEGER NOT NULL,
  open_at TIMESTAMP NOT NULL,
  close_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES "User"(id)
);
```

#### AttendanceRecord Table
```sql
CREATE TABLE AttendanceRecord (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  checked_in_at TIMESTAMP NOT NULL,
  validation_status VARCHAR(50) NOT NULL,
  validation_score INTEGER,
  location_accuracy DECIMAL(8,2),
  distance DECIMAL(10,2),
  device_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES "User"(id),
  FOREIGN KEY (session_id) REFERENCES AttendanceSession(id),
  UNIQUE(user_id, session_id)  -- One check-in per user per session
);
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/login` | ❌ | - | Login with credentials, get JWT |
| POST | `/auth/logout` | ✅ JWT | Any | Logout (invalidate token) |
| POST | `/auth/refresh` | ✅ JWT | Any | Refresh expired token |

**Examples**:

```bash
# Login
POST /auth/login
{
  "username": "student001",
  "password": "password123"
}
Response: {
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "code": "CS2024001",
      "role": "student",
      "name": "Nguyễn Văn A"
    }
  }
}
```

---

### Users

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/users/me` | ✅ JWT | Any | Get current authenticated user |
| GET | `/users/:id` | ✅ JWT | Any | Get user by ID |
| GET | `/users` | ✅ JWT | Admin | List all users |
| POST | `/users` | ✅ JWT | Admin | Create user |
| PUT | `/users/:id` | ✅ JWT | Admin | Update user |
| DELETE | `/users/:id` | ✅ JWT | Admin | Delete user |

---

### Attendance Sessions

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/attendance-sessions` | ✅ JWT | Lecturer/Admin | Create session |
| GET | `/attendance-sessions` | ✅ JWT | Any | List all sessions |
| GET | `/attendance-sessions/:id` | ✅ JWT | Any | Get session details |
| PUT | `/attendance-sessions/:id` | ✅ JWT | Lecturer/Admin | Update session |
| DELETE | `/attendance-sessions/:id` | ✅ JWT | Lecturer/Admin | Delete session |

**Example Request**:

```bash
POST /attendance-sessions
Authorization: Bearer <token>

{
  "title": "Programming 101 - Lecture 1",
  "latitude": 10.7769,
  "longitude": 106.6981,
  "radius": 50,
  "openAt": "2025-09-03T08:00:00Z",
  "closeAt": "2025-09-03T09:00:00Z"
}
```

---

### Attendance Check-In

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/attendance/check-in` | ✅ JWT | Student | Submit check-in |

**Request Payload**:
```typescript
{
  sessionId: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  device: {
    deviceId: string;
    deviceModel: string;
    osVersion: string;
    appVersion: string;
  };
  integrity: {
    isLocationMocked: boolean;
    isEmulator: boolean;
    locationProvider: 'gps' | 'network' | 'fused';
  };
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "record": {
      "id": 1,
      "userId": 5,
      "sessionId": 1,
      "checkedInAt": "2025-09-03T08:15:30Z",
      "validationStatus": "approved",
      "validationScore": 95,
      "distance": 12.5,
      "notes": "Location verified within radius"
    },
    "validation": {
      "status": "approved",
      "score": 95,
      "details": {
        "location": { "coefficient": 0.02, "distance": 12.5 },
        "mockLocation": { "coefficient": 0.0 },
        "integrity": { "coefficient": 0.05 }
      }
    }
  }
}
```

---

### Attendance Records

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/attendance-records` | ✅ JWT | Lecturer/Admin | List records (filtered) |
| GET | `/attendance-records/:id` | ✅ JWT | Lecturer/Admin | Get record details |
| POST | `/attendance-records/:id/review` | ✅ JWT | Admin | Manually review flagged record |

**Query Parameters**:
```
?sessionId=1          - Filter by session
&status=flagged       - Filter by validation status
&userId=5             - Filter by user
&startDate=2025-09-01 - Date range filter
&endDate=2025-09-30
```

---

## Development Workflow

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd gps-attendance
pnpm install

# 2. Build shared types
pnpm build:shared

# 3. Setup database (PostgreSQL)
# Create database, configure .env file
# Update DATABASE_URL in server/.env

# 4. Run Prisma migrations
cd server/attendance
npx prisma migrate dev
```

### Development

**Terminal 1 - Backend**:
```bash
cd gps-attendance
pnpm dev:attendance
# Runs at http://localhost:3000
# Auto-rebuilds on file change
```

**Terminal 2 - Mobile**:
```bash
cd gps-attendance
pnpm dev:mobile
# Starts Expo dev server
# Scan QR code with Expo Go app
```

**Terminal 3 - Admin Dashboard**:
```bash
cd gps-attendance
pnpm dev:admin
# Runs at http://localhost:5173
# Hot reload on file change
```

**Terminal 4 - Watch shared types** (if modifying shared/):
```bash
cd gps-attendance
pnpm dev:shared
# Watches and rebuilds shared/ on change
```

### Code Organization

**Naming Conventions** (from `docs/conventions/naming.md`):
- Files/folders: `kebab-case` (`attendance-sessions.service.ts`)
- Classes/interfaces: `PascalCase` (`AttendanceSession`)
- Constants (enums): `PascalCase` names, `SCREAMING_SNAKE_CASE` values
- Comments: Vietnamese for complex logic, English for code

**Branch Naming**:
- `feature/<short-description>` or `feature/<TICKET>-<description>`
- Group related changes in one branch
- Separate unrelated changes

**Commit Messages** (Vietnamese):
- Descriptive commit messages in Vietnamese
- Link to issue/ticket if applicable

---

### Testing

```bash
# Unit tests (NestJS)
cd server/attendance
pnpm test

# E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

---

### Building & Deployment

**Production Build**:
```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:attendance
pnpm build:admin
```

**Docker** (optional):
```bash
# Build and run backend with database
docker-compose up -d

# Stops containers
docker-compose down
```

---

## Deployment

### Backend Deployment

**Prerequisites**:
- PostgreSQL database
- Node.js >= 20 runtime
- Environment variables configured

**Environment Variables** (`server/attendance/.env`):
```env
DATABASE_URL=postgresql://user:password@host:5432/attendance_db
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

**Deployment Steps**:
1. Build: `pnpm build:attendance`
2. Install production dependencies: `pnpm install --prod`
3. Run migrations: `npx prisma migrate deploy`
4. Start server: `node dist/main.js` or via PM2/systemd
5. Setup reverse proxy (nginx/Apache) for HTTPS

**Scaling Considerations**:
- Database connection pooling (Prisma client config)
- API rate limiting on check-in endpoint (handle peak load)
- Caching layer for frequently accessed sessions
- Load balancer for multiple server instances

### Mobile App Deployment

**iOS**:
- Build with Expo:
  ```bash
  cd client/mobile-client
  eas build --platform ios
  ```
- Or submit via Xcode/App Store Connect

**Android**:
- Build with Expo:
  ```bash
  cd client/mobile-client
  eas build --platform android
  ```
- Or build APK locally and upload to Google Play

### Admin Dashboard Deployment

**Build**:
```bash
cd client/admin-dashboard
pnpm build
# Output: dist/ folder (static files)
```

**Host on**:
- Netlify (automatic deployments from Git)
- Vercel
- Traditional web server (nginx/Apache)
- AWS S3 + CloudFront
- Firebase Hosting

**Configuration**:
- Update `VITE_API_URL` to point to backend
- Configure CORS on backend to allow dashboard domain
- Setup HTTPS for secure token transmission

---

## Additional Resources

### Documentation Files
- [API Response Format](docs/conventions/api-response.md)
- [Auth & Guards](docs/conventions/auth-guards.md)
- [Module Structure Rules](docs/conventions/module-structure.md)
- [Naming Conventions](docs/conventions/naming.md)

### Key Files to Study
- Backend: `server/attendance/src/app.module.ts`
- Shared: `packages/shared/src/index.ts`
- Mobile: `client/mobile-client/src/app/index.tsx`
- Admin: `client/admin-dashboard/src/pages/DashboardPage.tsx`

### External References
- NestJS Documentation: https://docs.nestjs.com
- Expo Documentation: https://docs.expo.dev
- React Documentation: https://react.dev
- Prisma ORM: https://www.prisma.io/docs
- TypeScript Handbook: https://www.typescriptlang.org/docs

---

## Common Tasks

### Add a new API endpoint

1. Create DTO in `src/<domain>/dto/` with validation decorators
2. Add method in `<domain>.service.ts`
3. Add controller method in `<domain>.controller.ts` with `@UseGuards`, `@Roles`
4. Add to shared types if needed: `packages/shared/src/api/<domain>/`
5. Implement client-side call in mobile/admin

### Add a new validation check

1. Create check file in `src/attendance-validation/checks/<check-name>.check.ts`
2. Implement check logic returning `coefficient` (0-1)
3. Add check to `attendance-validation.service.ts` orchestration
4. Update scoring algorithm if needed
5. Test with various GPS coordinates

### Handle database schema change

1. Modify `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name <description>`
3. Review generated migration in `prisma/migrations/`
4. Update TypeScript models and interfaces
5. Update client types if necessary

---

## Troubleshooting

### Common Issues

**Issue**: "Cannot find module '@gps-attendance/shared'"
- **Solution**: Run `pnpm install` and `pnpm build:shared` in root

**Issue**: Mobile app can't connect to backend
- **Solution**: Check `EXPO_PUBLIC_API_URL` environment variable, ensure backend is running

**Issue**: Location services not working on emulator
- **Solution**: Use real device, or configure emulator's location provider

**Issue**: Mock location detection not working on iOS
- **Solution**: iOS has limited mock detection; implement server-side validation

**Issue**: Database connection failed
- **Solution**: Check `DATABASE_URL` env var, ensure PostgreSQL is running

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-03  
**Author**: GPS Attendance Team
