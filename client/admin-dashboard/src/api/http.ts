import { createHttpClient } from '@gps-attendance/shared';

import { createGetCache } from './get-cache';

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:3001';

const getCache = createGetCache();
const getToken = () =>
  sessionStorage.getItem('token') ?? localStorage.getItem('token');
const client = createHttpClient(apiBaseUrl, getToken, () => {
  window.dispatchEvent(new Event('auth:expired'));
});

export const clearGetCache = () => getCache.clear();

export const httpClient = {
  get<T>(path: string): Promise<T> {
    getCache.setScope(getToken());
    return getCache.get(path, () => client.get<T>(path), 30_000);
  },

  getFresh<T>(path: string): Promise<T> {
    getCache.setScope(getToken());
    return getCache.get(path, () => client.get<T>(path), 30_000, true);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const result = await client.post<T>(path, body);
    clearGetCache();
    return result;
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const result = await client.patch<T>(path, body);
    clearGetCache();
    return result;
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const result = await client.put<T>(path, body);
    clearGetCache();
    return result;
  },

  async delete<T>(path: string): Promise<T> {
    const result = await client.delete<T>(path);
    clearGetCache();
    return result;
  },
};
