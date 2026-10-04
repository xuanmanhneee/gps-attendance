import Constants from 'expo-constants';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
const apiHost = metroHost === 'localhost' ? '127.0.0.1' : metroHost;

export const BASE_URL =
  configuredApiUrl ||
  (apiHost ? `http://${apiHost}:3000` : 'http://127.0.0.1:3000');

export const API_TIMEOUT = 30000; // 30 seconds

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401 && path.includes('/auth/login')) {
        throw new ApiRequestError(
          errorData.message || 'Tài khoản hoặc mật khẩu không đúng.',
          401,
        );
      }
      throw new ApiRequestError(
        errorData.message || `Yêu cầu thất bại (HTTP ${response.status}).`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (controller.signal.aborted) {
      throw new ApiRequestError(
        'Kết nối tới máy chủ quá thời gian chờ (Timeout). Vui lòng thử lại.',
        0,
      );
    }

    throw new ApiRequestError(
      `Không thể kết nối đến máy chủ (${BASE_URL}).\n\nVui lòng kiểm tra:\n1. Máy chủ backend đã chạy chưa (pnpm dev:attendance).\n2. Nếu dùng mạng nội bộ, điện thoại và máy chủ có cùng mạng Wi-Fi không.\n3. Nếu dùng ngrok, EXPO_PUBLIC_API_URL có đúng URL tunnel không.`,
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const http = {
  get<T>(path: string, token?: string): Promise<T> {
    return request<T>(path, { method: 'GET' }, token);
  },

  post<T>(
    path: string,
    body: unknown,
    token?: string,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      token,
    );
  },

  put<T>(
    path: string,
    body: unknown,
    token?: string,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      token,
    );
  },

  delete<T>(path: string, token?: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' }, token);
  },
};
