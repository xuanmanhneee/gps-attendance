import { FetchHttpClient } from './fetch-client';

export const BASE_URL =
  'https://uncravingly-protomorphic-grayce.ngrok-free.dev';

export const http = new FetchHttpClient(BASE_URL);
