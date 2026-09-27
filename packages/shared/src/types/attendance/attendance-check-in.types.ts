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
  | 'LOW_LOCATION_ACCURACY';

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

export type CheckInResponse =
  | {
      status: 'VALID';
    }
  | {
      status: 'REVIEW' | 'REJECTED';
      reasons: [AttendanceCheckInReason, ...AttendanceCheckInReason[]];
    };

export type LocationPayload = Location;
export type DevicePayload = Device;
export type DeviceIntegrityPayload = DeviceIntegrity;
export type AttendanceCheckInResult = CheckInResponse;
export type CheckInRequestPayload = CheckInRequest;
export type CheckInResponsePayload = CheckInResponse;

