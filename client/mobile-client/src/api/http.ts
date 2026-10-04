import { getToken } from '@/services/token';
import { createHttpClient } from '@gps-attendance/shared';
import { BASE_URL } from './api';

export const httpClient = createHttpClient(
  BASE_URL,
  () => getToken(),
);
