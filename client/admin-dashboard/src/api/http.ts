import { createHttpClient } from '@gps-attendance/shared';

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:3000';

export const httpClient = createHttpClient(
  apiBaseUrl,
  () => localStorage.getItem('token'),
);
