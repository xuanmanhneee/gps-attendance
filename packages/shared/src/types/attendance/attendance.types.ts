// -----------------------------------------------------------------------------
// Location
// -----------------------------------------------------------------------------

export interface LocationPayload {
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

export interface DevicePayload {
  /** Installation ID do app tự sinh và lưu trên thiết bị */
  deviceId: string;

  /** Nền tảng thiết bị */
  platform: 'android' | 'ios';

  /** Tên model thiết bị */
  model: string;
}

// -----------------------------------------------------------------------------
// Device integrity
// -----------------------------------------------------------------------------

export interface DeviceIntegrityPayload {
  /** Play Integrity (Android) / App Attest (iOS) token */
  integrityToken: string | null;
}

// -----------------------------------------------------------------------------
// Attendance
// -----------------------------------------------------------------------------

export type AttendanceValidationStatus = 'VALID' | 'REVIEW' | 'REJECTED';

export type AttendanceValidationReason =
  | 'LOW_CONFIDENCE_SCORE'
  | 'LOW_LOCATION_ACCURACY'
  | 'MOCK_LOCATION'
  | 'DUPLICATE_DEVICE'
  | 'OUT_OF_RANGE';

export interface CheckInRequestPayload {
  /** Phiên điểm danh */
  sessionId: number;

  location: LocationPayload;
  device: DevicePayload;
  integrity: DeviceIntegrityPayload;
}

export interface CheckInResponsePayload {
  status: AttendanceValidationStatus;
  reasons: (AttendanceValidationReason | 'TOO_MANY_ATTEMPTS')[];
}
