import type { HttpClient, TokenProvider } from './http-client';
import { ApiError, CommonErrorCode, type ApiResponse } from './response';

const API_TIMEOUT = 30000;

export class FetchHttpClient implements HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken?: TokenProvider,
    private readonly onUnauthorized?: () => void,
  ) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    const token = this.getToken?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers,
          signal: controller.signal,
        });
      } catch {
        // fetch chỉ reject khi không nhận được response: bị huỷ do timeout
        // hoặc lỗi mạng. Đổi thành ApiError để UI hiển thị thông báo thử lại.
        throw controller.signal.aborted
          ? new ApiError(
              CommonErrorCode.REQUEST_TIMEOUT,
              'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
              0,
            )
          : new ApiError(
              CommonErrorCode.NETWORK_ERROR,
              'Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng và thử lại.',
              0,
            );
      }

      const result = (await response
        .json()
        .catch(() => null)) as ApiResponse<T> | null;

      if (!response.ok || !result || !result.success) {
        if (response.status === 401) {
          this.onUnauthorized?.();
        }

        if (result && !result.success) {
          throw new ApiError(result.code, result.message, response.status);
        }

        // Body không phải ApiResponse, ví dụ trang lỗi 502/504 của nginx khi quá tải
        throw new ApiError(
          CommonErrorCode.UNKNOWN_ERROR,
          response.status >= 500 || response.status === 429
            ? 'Máy chủ đang bận. Vui lòng thử lại sau ít phút.'
            : `API request failed: ${response.status}`,
          response.status,
        );
      }

      return result.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}
