import { FetchHttpClient } from './fetch-client';

export const BASE_URL = 'http://localhost:3000';

export const http = new FetchHttpClient(BASE_URL);
