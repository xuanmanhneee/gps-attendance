import {
  ApiError,
  createHttpClient,
  type HttpClient,
  type LoginResponse,
} from '@gps-attendance/shared';
import { tokenService } from '../services/token.service';
import { createGetCache } from './get-cache';

const baseUrl = import.meta.env.VITE_API_BASE_URL;
const authenticatedClient = createHttpClient(baseUrl, () => tokenService.get());
const anonymousClient = createHttpClient(baseUrl);
let refreshPromise: Promise<void> | null = null;
const getCache = createGetCache();
const getTtlMs = (path: string) =>
  path.startsWith('/v0/attendance-sessions') ||
  path.startsWith('/v0/attendance/sessions/')
    ? 10_000
    : 60_000;

export const clearGetCache = () => getCache.clear();

const get = <T>(path: string, fresh = false): Promise<T> => {
  getCache.setScope(tokenService.get());
  return getCache.get(
    path,
    () => withRefresh(path, () => authenticatedClient.get<T>(path)),
    getTtlMs(path),
    fresh,
  );
};

const mutate = async <T>(
  path: string,
  request: () => Promise<T>,
): Promise<T> => {
  const result = await withRefresh(path, request);
  getCache.clear();
  return result;
};

const refreshAccessToken = (): Promise<void> => {
  if (!refreshPromise) {
    const refreshToken = tokenService.getRefresh();
    if (!refreshToken) return Promise.reject(new Error('No refresh token'));

    refreshPromise = anonymousClient
      .post<LoginResponse>('/v0/admin/auth/refresh', { refreshToken })
      .then((tokens) => {
        if (tokenService.getRefresh() !== refreshToken) {
          throw new Error('Remembered login changed during refresh');
        }
        tokenService.set(tokens.accessToken, tokens.refreshToken);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const withRefresh = async <T>(
  path: string,
  request: () => Promise<T>,
): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      path.startsWith('/v0/admin/auth/') ||
      !tokenService.getRefresh()
    ) {
      throw error;
    }

    const refreshToken = tokenService.getRefresh();
    try {
      await refreshAccessToken();
    } catch {
      if (tokenService.getRefresh() === refreshToken) {
        tokenService.remove();
        window.dispatchEvent(new Event('auth:expired'));
      }
      throw error;
    }

    return request();
  }
};

export const httpClient = {
  get: <T>(path: string) => get<T>(path),
  getFresh: <T>(path: string) => get<T>(path, true),
  post: <T>(path: string, body?: unknown) =>
    mutate(path, () => authenticatedClient.post<T>(path, body)),
  put: <T>(path: string, body?: unknown) =>
    mutate(path, () => authenticatedClient.put<T>(path, body)),
  patch: <T>(path: string, body?: unknown) =>
    mutate(path, () => authenticatedClient.patch<T>(path, body)),
  delete: <T>(path: string) =>
    mutate(path, () => authenticatedClient.delete<T>(path)),
} satisfies HttpClient & { getFresh: HttpClient['get'] };
