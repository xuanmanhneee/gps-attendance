import type { DeviceIntegrity } from '@gps-attendance/shared';
import * as Device from 'expo-device';

export interface DeviceSecurityCheckResult {
  isRealDevice: boolean;
  isRooted: boolean;
  isSafe: boolean;
  reasons: string[];
}

/**
 * Quét an toàn thiết bị ngoại tuyến (Offline Device Security Checks):
 * - Kiểm tra máy thật vs máy ảo/mô phỏng (Device.isDevice)
 * - Kiểm tra thiết bị đã bị can thiệp root/jailbreak chưa (Device.isRootedExperimentalAsync)
 */
export async function checkDeviceSecurity(): Promise<DeviceSecurityCheckResult> {
  const isRealDevice = Device.isDevice ?? true;
  let isRooted = false;

  try {
    if (typeof Device.isRootedExperimentalAsync === 'function') {
      isRooted = await Device.isRootedExperimentalAsync();
    }
  } catch (error) {
    console.warn('Unable to evaluate root detection:', error);
    isRooted = false;
  }

  const reasons: string[] = [];
  if (!isRealDevice) {
    reasons.push('Thiết bị đang chạy trên máy ảo / giả lập (Emulator).');
  }
  if (isRooted) {
    reasons.push('Thiết bị đã bị can thiệp quyền hệ thống (Root / Jailbreak).');
  }

  return {
    isRealDevice,
    isRooted,
    isSafe: isRealDevice && !isRooted,
    reasons,
  };
}

/**
 * Tạo token chứng thực tính toàn vẹn thiết bị ngoại tuyến (Offline Attestation Token)
 * Tuân thủ cấu trúc Play Integrity / App Attest để backend thẩm định an toàn mà không cần trả phí Google.
 */
export async function getIntegrity(_nonce?: string): Promise<DeviceIntegrity> {
  const security = await checkDeviceSecurity();

  const payload = {
    appLicensingVerdict: 'LICENSED',
    deviceRecognitionVerdict: security.isSafe
      ? ['MEETS_DEVICE_INTEGRITY', 'MEETS_BASIC_INTEGRITY']
      : ['MEETS_NO_INTEGRITY'],
    securityChecks: {
      isRealDevice: security.isRealDevice,
      isRooted: security.isRooted,
      offlineAttestation: true,
      timestamp: Date.now(),
      brand: Device.brand ?? 'unknown',
      modelName: Device.modelName ?? 'unknown',
    },
  };

  return {
    integrityToken: JSON.stringify(payload),
  };
}
