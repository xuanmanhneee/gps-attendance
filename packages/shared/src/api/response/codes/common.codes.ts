export const CommonErrorCode = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',       // 500 — bug/crash không lường trước
  VALIDATION_ERROR: 'VALIDATION_ERROR',   // 400 — sai input, dùng cho ValidationPipe
  UNAUTHORIZED: 'UNAUTHORIZED',           // 401
  FORBIDDEN: 'FORBIDDEN',                 // 403
  NOT_FOUND: 'NOT_FOUND',                 // 404 — generic, khi không có domain-specific code
  CONFLICT: 'CONFLICT',                   // 409 — generic
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS', // 429
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE', // 503 — phụ thuộc (DB, Redis) không phản hồi
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',         // fallback cuối cùng nếu không map được status nào
  // Hai code dưới chỉ do client tự sinh (status = 0), server không bao giờ trả về
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',     // request vượt quá thời gian chờ, client đã huỷ
  NETWORK_ERROR: 'NETWORK_ERROR',         // không kết nối được tới máy chủ
} as const;

export type CommonErrorCode = (typeof CommonErrorCode)[keyof typeof CommonErrorCode];