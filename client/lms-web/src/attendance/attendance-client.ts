import { parseEnvelope, type ApiFailure } from './attendance-envelope.ts';

// Gọi server Attendance qua proxy của Vite (vite.config.ts: /attendance-api -> :3000)
// để tránh gọi chéo origin. Token chỉ nằm trong header Authorization, không lên URL, không log.
const BASE = '/attendance-api';
const TOKEN_KEY = 'attendance-jwt';

export const tokenStore = {
  get: (): string => sessionStorage.getItem(TOKEN_KEY) ?? '',
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export type AttendanceResult =
  | { ok: true; data: unknown }
  | { ok: false; failure: ApiFailure };

export async function attendanceRequest(
  path: string,
  options: { method?: 'GET' | 'PATCH'; body?: unknown; token?: string } = {},
): Promise<AttendanceResult> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined
          ? { 'content-type': 'application/json' }
          : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    return { ok: false, failure: { kind: 'network' } };
  }
  let body: unknown;
  try {
    const text = await response.text();
    body = text ? JSON.parse(text) : undefined;
  } catch {
    // Proxy lỗi (vd 502 trả HTML) hoặc thân hỏng: phân loại theo status.
    return response.ok
      ? { ok: false, failure: { kind: 'invalid-response', status: response.status } }
      : parseEnvelope(response.status, undefined);
  }
  return parseEnvelope(response.status, body);
}
