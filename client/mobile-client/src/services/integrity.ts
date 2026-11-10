import type {
  AttendanceIntegrityInput,
  DeviceIntegrity,
} from '@gps-attendance/attendance-client';

/**
 * Giai đoạn 1 (Expo Go): chưa có nguồn thật nên trả null.
 * Giai đoạn 2: thay ruột bằng Play Integrity (Android) / App Attest (iOS).
 */
export async function getIntegrity(
  _input: AttendanceIntegrityInput,
): Promise<DeviceIntegrity> {
  return { integrityToken: null };
}
