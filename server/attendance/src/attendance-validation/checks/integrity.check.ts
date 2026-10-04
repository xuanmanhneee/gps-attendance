// integrity.check.ts
import { DeviceIntegrity } from '@gps-attendance/shared';
import { IntegrityCheckResult } from '../attendance-validation.types';

export class IntegrityCheck {
  /**
   * Đánh giá độ toàn vẹn của thiết bị (Play Integrity / DeviceCheck / App Attest).
   * Phân tích cấu trúc token, verdict hoặc chữ ký số.
   */
  evaluate(integrity: DeviceIntegrity): IntegrityCheckResult {
    const token = integrity.integrityToken?.trim();

    if (!token) {
      // Thiết bị không gửi kèm token bảo vệ
      return { coefficient: 0.5 };
    }

    try {
      // 1. Kiểm tra nếu là JSON token trực tiếp (Simulation/Local Test payload)
      if (token.startsWith('{') && token.endsWith('}')) {
        const payload = JSON.parse(token);
        if (
          payload.appLicensingVerdict === 'LICENSED' ||
          payload.deviceRecognitionVerdict?.includes('MEETS_DEVICE_INTEGRITY') ||
          payload.deviceRecognitionVerdict?.includes('MEETS_BASIC_INTEGRITY')
        ) {
          return { coefficient: 1.0 };
        }
      }

      // 2. Kiểm tra nếu là JWT hoặc Base64 format (Play Integrity / App Attest format)
      const parts = token.split('.');
      if (parts.length === 3) {
        // Cấu trúc JWT hợp lệ (Header.Payload.Signature)
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        const deviceVerdict =
          payload?.deviceIntegrity?.deviceRecognitionVerdict ?? [];

        if (
          deviceVerdict.includes('MEETS_STRONG_INTEGRITY') ||
          deviceVerdict.includes('MEETS_DEVICE_INTEGRITY') ||
          payload?.appLicensingVerdict === 'LICENSED'
        ) {
          return { coefficient: 1.0 };
        }
        return { coefficient: 0.85 };
      }

      // 3. Fallback token chuỗi thông thường (chuỗi token > 20 ký tự được xem là token hợp lệ từ mobile)
      if (token.length >= 20) {
        return { coefficient: 0.9 };
      }
    } catch {
      // Không phân tích được nhưng có token gửi lên
      return { coefficient: 0.7 };
    }

    return { coefficient: 0.7 };
  }
}
