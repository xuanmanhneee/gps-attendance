import type { HttpClient, TokenProvider } from './http-client';
import { ApiError, type ApiResponse } from './response';

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
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

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

        throw new Error(`API request failed: ${response.status}`);
      }

      return result.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}
