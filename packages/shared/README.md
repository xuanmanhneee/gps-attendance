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
│   ├── users/                 # Role, profile, filter criteria
│   ├── units/                 # Unit hierarchy contracts
│   └── attendance/            # Session, check-in, validation, records
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
| `user.types.ts` | Role và user profile contracts |
| `user-filter.types.ts` | `UserFilterCriteria`: lọc theo đơn vị, thẻ và mã; semantics thực thi nằm trong backend `UserFilterService` |

`types/units/` định nghĩa contract đơn vị phân cấp. Database có model Unit, Tag và UserTag; không nên ghi semantics lọc thay cho service backend.

### Attendance (`types/attendance/`)

| File | Nội dung |
|---|---|
| `attendance.types.ts` | Barrel / type chung |
| `attendance-session.types.ts` | Session request/response, status, detail (participants + attempts), analytics/history contracts |
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
{ success: false, code: ApiErrorCode, message: string }
```

`api-response.types.ts`, class `ApiError` (`api-error.ts`).

### Error codes (theo domain)

Các code được export từ `api/response/error_codes/index.ts`, theo domain common, auth, user, unit, attendance session, check-in và attendance record. `api-error.codes.ts` gom các domain thành union `ApiErrorCode`.

Khi thêm code, đặt trong file đúng domain, cập nhật barrel export, backend và cách UI hiển thị. Không giả định mọi Nest exception đã được gán code chuyên biệt.

### HTTP client (dashboard dùng)

| File | Việc |
|---|---|
| `http-client.ts` | Interface client + `TokenProvider` |
| `fetch-client.ts` | Implement fetch, gắn Bearer và header ngrok, unwrap `ApiResponse`, ném `ApiError` |
| `create-http-client.ts` | Factory `createHttpClient(baseUrl, getToken, onUnauthorized?)` |
| `http.ts` | Re-export helper |

Fetch client trả `result.data` khi envelope thành công; HTTP lỗi hoặc `success: false` sẽ ném lỗi. HTTP 401 gọi `onUnauthorized` nếu có callback. Client **không tự refresh token**. Mobile dùng wrapper riêng tại `client/mobile-client/src/api/api.ts`.

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

Đổi type ở đây mà không build lại có thể khiến consumer đọc `dist/` cũ. Các root scripts `predev:*`/`build:*` sẽ build shared trước ở những luồng được khai báo trong `package.json`.

---

## 6. Ai import gì

| Consumer | Dùng |
|---|---|
| `server/attendance` | DTO/API response, roles, filters, attendance contracts, error codes |
| `admin-dashboard` | Auth/session/location/course-section contracts, `createHttpClient`, `ApiError` |
| `mobile-client` | Auth, attendance/check-in/history types; HTTP wrapper riêng |

## 7. Thay đổi contract

1. Sửa type trong domain tương ứng dưới `src/types/` hoặc `src/api/`.
2. Cập nhật barrel exports và implementation backend/client liên quan.
3. Chạy `pnpm build:shared` từ root, sau đó build/test các package consumer.
4. Nếu đổi response/error semantics, cập nhật tài liệu API backend và xử lý UI.
