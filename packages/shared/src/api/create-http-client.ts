import { FetchHttpClient } from './fetch-client';
import type { TokenProvider } from './http-client';
export function createHttpClient(
  baseUrl: string,
  getToken?: TokenProvider,
  onUnauthorized?: () => void,
) {
  return new FetchHttpClient(baseUrl, getToken, onUnauthorized);
}
