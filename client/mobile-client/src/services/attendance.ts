import type { CheckInRequest, CheckInResponse } from '@gps-attendance/shared';
import { attendanceCheckInApi } from '@/api';
import { isMockLocationForced } from './dev-mode';
import { getCurrentLocation } from './location';
import { buildDeviceInfo } from './device-info';
import { getIntegrity } from './integrity';

// Phần dữ liệu thiết bị, không phụ thuộc sessionId
export async function collectCheckInContext() {
  const [location, device, integrity] = await Promise.all([
    getCurrentLocation(),
    buildDeviceInfo(),
    getIntegrity(),
  ]);

  // Dev mode: ép cờ mock location để thử nhánh server từ chối
  // (REJECTED / MOCK_LOCATION) mà không cần app giả lập GPS.
  return {
    location: isMockLocationForced()
      ? { ...location, isMockLocation: true }
      : location,
    device,
    integrity,
  };
}

export async function buildCheckInPayload(sessionId: number): Promise<CheckInRequest> {
  return { sessionId, ...(await collectCheckInContext()) };
}

export async function checkIn(sessionId: number): Promise<CheckInResponse> {
  return attendanceCheckInApi.checkIn(await buildCheckInPayload(sessionId));
}