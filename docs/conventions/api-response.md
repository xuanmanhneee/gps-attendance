# API Response & Error Code

## 1. ApiResponse<T>

Mọi response từ server luôn theo discriminated union, định nghĩa tại
`packages/shared/src/api/response`:

```typescript
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

**Quy tắc:**
- Không dùng field optional kiểu `data?: T; error?: string` — luôn dùng
  discriminated union để TypeScript tự narrow type theo `success`.
- Controller trả về đúng shape `{ success: true, data }` — không trả raw
  object hay array trực tiếp.
- Khi throw lỗi nghiệp vụ, dùng `code` theo convention ở mục 2, không tự
  chế message tự do làm code.

## 2. Error code

Mỗi domain định nghĩa 1 const object namespaced theo domain, đặt trong
`packages/shared/src/api/response/error_codes/`:

```typescript
export const AttendanceSessionErrorCode = {
  NOT_FOUND: 'ATTENDANCE_SESSION_NOT_FOUND',
  INVALID_TIME_RANGE: 'ATTENDANCE_SESSION_INVALID_TIME_RANGE',
  INVALID_RADIUS: 'ATTENDANCE_SESSION_INVALID_RADIUS',
  CREATION_FORBIDDEN: 'ATTENDANCE_SESSION_CREATION_FORBIDDEN',
} as const;
```

**Quy tắc:**
- Tên file: `<domain>-error.codes.ts`.
- Tên const: `<Domain>ErrorCode` (PascalCase).
- Giá trị string: `<DOMAIN>_<REASON>` (SCREAMING_SNAKE_CASE), luôn prefix
  bằng tên domain để tránh đụng code giữa các domain khác nhau.
- Luôn thêm `as const` để TypeScript suy ra union literal type, phục vụ
  switch-case exhaustive check ở phía client.
- Export từ `packages/shared/src/api/<domain>/index.ts` để client import
  gọn qua 1 path.