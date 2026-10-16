import { httpClient } from './http';

export interface RegisteredDeviceItem {
  id: number;
  userId: number;
  userCode: string;
  userFullname: string;
  userEmail: string;
  deviceId: string;
  platform: string;
  model: string | null;
  trustStatus: 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED';
  firstSeenAt: string;
  lastSeenAt: string;
  blockedAt: string | null;
}

export interface ListDevicesResponse {
  items: RegisteredDeviceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReplaceDevicePayload {
  newDeviceId?: string;
  newModel?: string;
  newPlatform?: string;
  trustStatus?: 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED';
  note?: string;
}

export const deviceTrustApi = {
  list(params?: {
    search?: string;
    trustStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.trustStatus && params.trustStatus !== 'ALL') {
      query.set('trustStatus', params.trustStatus);
    }
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    return httpClient.get<ListDevicesResponse>(`/v0/admin/devices${qs ? `?${qs}` : ''}`);
  },

  updateTrust(
    id: number,
    trustStatus: 'UNVERIFIED' | 'TRUSTED' | 'BLOCKED',
    note?: string,
  ) {
    return httpClient.patch<{
      id: number;
      userCode: string;
      userFullname: string;
      deviceId: string;
      platform: string;
      model: string | null;
      trustStatus: string;
      blockedAt: string | null;
    }>(`/v0/admin/devices/${id}/trust`, { trustStatus, note });
  },

  replaceDevice(id: number, data: ReplaceDevicePayload) {
    return httpClient.post<{
      id: number;
      userCode: string;
      userFullname: string;
      deviceId: string;
      platform: string;
      model: string | null;
      trustStatus: string;
      blockedAt: string | null;
    }>(`/v0/admin/devices/${id}/replace`, data);
  },

  resetDevice(id: number, note?: string) {
    const query = note ? `?note=${encodeURIComponent(note)}` : '';
    return httpClient.delete<{
      message: string;
      userCode: string;
      userFullname: string;
    }>(`/v0/admin/devices/${id}${query}`);
  },
};
