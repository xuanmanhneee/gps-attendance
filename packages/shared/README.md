# Shared package — `@gps-attendance/shared`

Contract TypeScript dùng chung cho backend, dashboard và mobile. Client/server import **bản `dist/`** (sau `pnpm build:shared`), không compile trực tiếp `src/` của package này.

Tổng quan: [../../README.md](../../README.md).

---

## 1. Phạm vi

Mọi type, DTO, error code, HTTP helper trong `packages/shared/`. Không chứa nghiệp vụ Nest hay UI.

`package.json`: `main` → `dist/index.js`, `types` → `dist/index.d.ts`. Scripts: `build` (`tsc`), `clean`.

Entry `src/index.ts`: `export * from './types'` và `export * from './api'`.

---

## 2. Cấu trúc `src/`

```text
src/
├── index.ts
├── types/
│   ├── index.ts
│   ├── device.types.ts
│   ├── auth/
│   ├── users/
│   └── attendance/
└── api/
    ├── index.ts
    ├── http.ts / http-client.ts / fetch-client.ts / create-http-client.ts
    ├── auth/
    ├── attendance-session/
    └── response/
        ├── api-response.types.ts
        ├── api-error.ts
        └── error_codes/
```

---

## 3. `types/` — mô hình dữ liệu

### Auth (`types/auth/`)

Login request/response, JWT payload shapes dùng chung client.

### Users (`types/users/`)

| File | Nội dung |
|---|---|
| `user.types.ts` | Role, profile DTO (`code`, `role`, `fullname`) |
| `user-filter.types.ts` | `UserFilterCriteria`: `unitFilter`, `tagFilter`, `codeFilter` (`addCodes`, `excludeCodes`). **Backend hiện chỉ dùng `codeFilter.addCodes`.** Unit/Tag chưa có bảng DB. |

### Attendance (`types/attendance/`)

| File | Nội dung |
|---|---|
| `attendance.types.ts` | Barrel / type chung |
| `attendance-session.types.ts` | Session response, `SessionStatus` (`pending` \| `open` \| `closed`), create request, detail (participants + attempts) |
| `attendance-check-in.types.ts` | Payload check-in, location, result `VALID` \| `REVIEW` \| `REJECTED` |
| `attendance-validation.types.ts` | `AttendanceValidationReason` (OUT_OF_RANGE, MOCK_LOCATION, …) |
| `attendance-record.types.ts` | Record + `StudentAttendanceHistoryItemDto` |

### Device (`types/device.types.ts`)

`deviceId`, `platform` (`android` \| `ios`), `model`, `DeviceIntegrityPayload` (`integrityToken`).

---

## 4. `api/` — HTTP và response

### Chuẩn `ApiResponse`

```ts
{ success: true, data: T }
{ success: false, code: string, message: string }
```

`api-response.types.ts`, class `ApiError` (`api-error.ts`).

### Error codes (theo domain)

| File | Ví dụ code |
|---|---|
| `common-error.codes.ts` | INTERNAL_ERROR, VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, TOO_MANY_REQUESTS, UNKNOWN_ERROR |
| `auth-error.codes.ts` | AUTH_INVALID_CREDENTIALS, AUTH_ACCOUNT_NOT_LINKED, AUTH_ROLE_NOT_ALLOWED, AUTH_TOKEN_EXPIRED, AUTH_INVALID_TOKEN, AUTH_UNAUTHORIZED |
| `user-error.codes.ts` | USER_NOT_FOUND, USER_ALREADY_EXISTS, USER_INVALID_ROLE |
| `attendance-session-error.codes.ts` | ATTENDANCE_SESSION_NOT_FOUND, INVALID_TIME_RANGE, INVALID_RADIUS, CREATION_FORBIDDEN, SESSION_NOT_OPEN |
| `attendance-check-in-error.codes.ts` | USER_NOT_IN_SESSION, ALREADY_CHECKED_IN, TOO_MANY_ATTEMPTS, DUPLICATE_DEVICE, OUT_OF_RANGE, MOCK_LOCATION, LOW_CONFIDENCE_SCORE |
| `attendance-record-error.codes.ts` | ATTENDANCE_RECORD_NOT_FOUND, ALREADY_EXISTS, INVALID_STATUS |
| `api-error.codes.ts` | union / re-export |

Backend `ApiExceptionFilter` map exception sang các code này.

### HTTP client (dashboard dùng)

| File | Việc |
|---|---|
| `http-client.ts` | Interface client + `TokenProvider` |
| `fetch-client.ts` | Implement fetch, gắn Bearer, unwrap `ApiResponse`, ném `ApiError` |
| `create-http-client.ts` | Factory `createHttpClient(baseUrl, getToken, onUnauthorized?)` |
| `http.ts` | Re-export helper |

Mobile **không** dùng client này; mobile có `src/api/api.ts` riêng.

### API module stubs

`api/auth/` và `api/attendance-session/`: type + hàm mô tả endpoint (song song types/). Dashboard hiện gọi HTTP qua `createHttpClient` trong `client/admin-dashboard/src/api/*`, không bắt buộc đi qua các file stub này.

---

## 5. Build

Từ root (các lệnh `dev:*` / `build:*` đều `pre` build shared):

```bash
pnpm build:shared
pnpm dev:shared    # tsc --watch
pnpm clean:shared
```

Đổi type ở đây mà không build lại → backend/client lệch `dist/` cũ.

---

## 6. Ai import gì

| Consumer | Dùng |
|---|---|
| `server/attendance` | DTO, ApiResponse, error codes, CheckIn payload/result |
| `admin-dashboard` | Login, session types, `createHttpClient`, `ApiError` |
| `mobile-client` | Check-in types, session, history DTO, `ApiResponse` (HTTP riêng) |
