import {
  ApiError,
  createHttpClient,
  type HttpClient,
  type LoginResponse,
} from '@gps-attendance/shared';

import {
  getAccessToken,
  getRefreshToken,
  removeTokens,
  saveTokens,
} from '../services/token';

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const authenticatedClient = createHttpClient(baseUrl, getAccessToken);

export const unauthenticatedHttpClient = createHttpClient(baseUrl);

let refreshPromise: Promise<void> | null = null;

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

async function refreshSession(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('Missing refresh token');

    const nextTokens = await unauthenticatedHttpClient.post<LoginResponse>(
      '/v0/user/auth/refresh',
      { refreshToken },
    );
    await saveTokens(nextTokens);
  })();

  try {
    await refreshPromise;
  } catch (error) {
    await removeTokens();
    throw error;
  } finally {
    refreshPromise = null;
  }
}

async function requestWithRefresh<T>(request: () => Promise<T>): Promise<T> {
  const attemptedAccessToken = getAccessToken();

  try {
    return await request();
  } catch (error) {
    if (!isUnauthorized(error)) throw error;

    try {
      // Một request khác có thể đã refresh trong khi request này còn đang bay.
      // Khi đó chỉ retry bằng access token mới, không xoay refresh token lần nữa.
      if (!attemptedAccessToken || getAccessToken() === attemptedAccessToken) {
        await refreshSession();
      }

      return await request();
    } catch (retryError) {
      if (isUnauthorized(retryError)) await removeTokens();
      throw retryError;
    }
  }
}

export const httpClient: HttpClient = {
  get: <T>(path: string) =>
    requestWithRefresh(() => authenticatedClient.get<T>(path)),
  post: <T>(path: string, body?: unknown) =>
    requestWithRefresh(() => authenticatedClient.post<T>(path, body)),
  put: <T>(path: string, body?: unknown) =>
    requestWithRefresh(() => authenticatedClient.put<T>(path, body)),
  patch: <T>(path: string, body?: unknown) =>
    requestWithRefresh(() => authenticatedClient.patch<T>(path, body)),
  delete: <T>(path: string) =>
    requestWithRefresh(() => authenticatedClient.delete<T>(path)),
};
