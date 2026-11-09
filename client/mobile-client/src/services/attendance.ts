import type { CheckInRequest, CheckInResponse } from '@gps-attendance/shared';
import { attendanceCheckInApi } from '@/api';
import { isMockLocationForced } from './dev-mode';
import { getCurrentLocation } from './location';
import { buildDeviceInfo } from './device-info';
import { getIntegrity } from '@/modules/integrity';

// Phần dữ liệu thiết bị, không phụ thuộc sessionId
export async function collectCheckInContext(sessionId?: number) {
  const [location, device] = await Promise.all([
    getCurrentLocation(),
    buildDeviceInfo(),
  ]);

  // Dev mode: ép cờ mock location để thử nhánh server từ chối
  // (REJECTED / MOCK_LOCATION) mà không cần app giả lập GPS.
  const context = {
    location: isMockLocationForced()
      ? { ...location, isMockLocation: true }
      : location,
    device,
  };

  return {
    ...context,
    integrity:
      sessionId === undefined
        ? { integrityToken: null }
        : await getIntegrity({ sessionId, ...context }),
  };
}

export async function buildCheckInPayload(
  sessionId: number,
): Promise<CheckInRequest> {
  return { sessionId, ...(await collectCheckInContext(sessionId)) };
}

export async function checkIn(sessionId: number): Promise<CheckInResponse> {
  return attendanceCheckInApi.checkIn(await buildCheckInPayload(sessionId));
}
