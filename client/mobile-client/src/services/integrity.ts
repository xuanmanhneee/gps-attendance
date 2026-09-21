import type { DeviceIntegrity } from '@gps-attendance/shared';

/**
 * Giai đoạn 1 (Expo Go): chưa có nguồn thật nên trả null.
 * Giai đoạn 2: thay ruột bằng Play Integrity (Android) / App Attest (iOS).
 *
 * `nonce` là challenge do server cấp, để token gắn với đúng request này
 * và không bị replay. Hiện chưa dùng.
 */
export async function getIntegrity(_nonce?: string): Promise<DeviceIntegrity> {
  return { integrityToken: null };
}
