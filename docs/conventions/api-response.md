# Quy ước Phản hồi API & Mã Lỗi (API Response & Error Codes)

## 1. Chuẩn phản hồi `ApiResponse<T>`

Mọi phản hồi (response) từ server luôn tuân thủ cấu trúc Discriminated Union chặt chẽ, được định nghĩa tại `packages/shared/src/api/response`:

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

**Các quy tắc bắt buộc:**
- **Không dùng trường tùy chọn (optional field)** kiểu `{ data?: T; error?: string }` — luôn luôn sử dụng discriminated union để trình biên dịch TypeScript tự động thu hẹp kiểu (narrow type) an toàn dựa trên thuộc tính `success`.
- **Controller luôn trả về đúng cấu trúc chuẩn** `{ success: true, data }` — tuyệt đối không trả về đối tượng thô (raw object) hoặc mảng trực tiếp ra ngoài HTTP response.
- **Khi ném ngoại lệ nghiệp vụ (business exception)**, bắt buộc dùng `code` theo đúng quy ước mã lỗi ở Mục 2 dưới đây, không tự ý sáng tác chuỗi thông báo tự do thay cho mã lỗi.

## 2. Quy ước Mã Lỗi (Error Codes)

Mỗi domain nghiệp vụ định nghĩa một hằng đối tượng (const object) có tiền tố phân vùng (namespaced) theo domain tương ứng, đặt tại thư mục `packages/shared/src/api/response/error_codes/`:

```typescript
export const AttendanceSessionErrorCode = {
  NOT_FOUND: 'ATTENDANCE_SESSION_NOT_FOUND',
  INVALID_TIME_RANGE: 'ATTENDANCE_SESSION_INVALID_TIME_RANGE',
  INVALID_RADIUS: 'ATTENDANCE_SESSION_INVALID_RADIUS',
  CREATION_FORBIDDEN: 'ATTENDANCE_SESSION_CREATION_FORBIDDEN',
} as const;
```

**Các quy tắc bắt buộc:**
- **Quy tắc đặt tên file:** `<domain>-error.codes.ts` (ví dụ: `attendance-check-in-error.codes.ts`, `attendance-session-error.codes.ts`).
- **Quy tắc đặt tên hằng:** `<Domain>ErrorCode` (viết theo định dạng PascalCase).
- **Quy tắc giá trị chuỗi (string value):** `<DOMAIN>_<REASON>` (viết hoa dạng SCREAMING_SNAKE_CASE), luôn bắt đầu bằng tên domain làm tiền tố để tránh xung đột mã lỗi giữa các phân hệ nghiệp vụ khác nhau.
- **Bắt buộc gắn `as const`:** Giúp TypeScript tự động suy diễn kiểu union literal, phục vụ kiểm tra toàn diện không sót trường hợp (exhaustive switch-case check) ở phía client.
- **Xuất khẩu tập trung (Export):** Luôn xuất khẩu từ `packages/shared/src/api/<domain>/index.ts` để phía ứng dụng client có thể import gọn gàng qua một đường dẫn duy nhất.
