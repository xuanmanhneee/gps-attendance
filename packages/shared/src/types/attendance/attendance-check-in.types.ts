// -----------------------------------------------------------------------------
// Location
// -----------------------------------------------------------------------------

export interface Location {
  /** Vĩ độ (decimal degrees) */
  latitude: number;

  /** Kinh độ (decimal degrees) */
  longitude: number;

  /** Độ chính xác GPS, đơn vị mét */
  accuracy: number;

  /** Thời điểm lấy vị trí, epoch milliseconds */
  timestamp: number;

  /** Vị trí có được đánh dấu là mock bởi hệ điều hành */
  isMockLocation: boolean;
}

// -----------------------------------------------------------------------------
// Device
// -----------------------------------------------------------------------------

export interface Device {
  /** Installation ID do app tự sinh và lưu trên thiết bị */
  deviceId: string;

  /** Nền tảng thiết bị */
  platform: 'android' | 'ios';

  /** Tên model thiết bị */
  model: string;
}

// -----------------------------------------------------------------------------
// Device Integrity
// -----------------------------------------------------------------------------

export interface DeviceIntegrity {
  /** Play Integrity (Android) / App Attest (iOS) token */
  integrityToken: string | null;
}

// -----------------------------------------------------------------------------
// Attendance Validation
// -----------------------------------------------------------------------------

export type AttendanceValidationStatus = 'VALID' | 'REVIEW' | 'REJECTED';

export type AttendanceValidationReason =
  | 'LOW_CONFIDENCE_SCORE'
  | 'MOCK_LOCATION'
  | 'OUT_OF_RANGE'
  | 'INVALID_LOCATION_TIMESTAMP';

// -----------------------------------------------------------------------------
// Attendance Check-in
// -----------------------------------------------------------------------------

export type AttendanceCheckInReason =
  AttendanceValidationReason | 'TOO_MANY_ATTEMPTS' | 'DUPLICATE_DEVICE';

export interface CheckInRequest {
  /** Phiên điểm danh */
  sessionId: number;

  location: Location;
  device: Device;
  integrity: DeviceIntegrity;
}

export type CheckInIntegrityInput = Pick<
  CheckInRequest,
  'sessionId' | 'location' | 'device'
>;

export function serializeCheckInIntegrityInput(
  input: CheckInIntegrityInput,
): string {
  return JSON.stringify({
    version: 1,
    sessionId: input.sessionId,
    location: {
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      accuracy: input.location.accuracy,
      timestamp: input.location.timestamp,
      isMockLocation: input.location.isMockLocation,
    },
    device: {
      deviceId: input.device.deviceId,
      platform: input.device.platform,
      model: input.device.model,
    },
  });
}

export type CheckInResponse =
  | {
      status: 'VALID';
    }
  | {
      status: 'REVIEW' | 'REJECTED';
      reasons: [AttendanceCheckInReason, ...AttendanceCheckInReason[]];
    };
