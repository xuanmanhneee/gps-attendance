export interface AttendanceCheckInPayload {
  studentId: string;
  deviceId: string;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  isMockLocation: boolean;
}

export enum AttendanceStatus {
  VALID = "VALID",
  SUSPICIOUS_LOCATION = "SUSPICIOUS_LOCATION",
  DUPLICATE_DEVICE = "DUPLICATE_DEVICE",
  OUT_OF_RANGE = "OUT_OF_RANGE",
}
