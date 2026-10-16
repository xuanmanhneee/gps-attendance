import {
  Location,
  Device,
  DeviceIntegrity,
  AttendanceValidationStatus,
  AttendanceValidationReason,
} from '@gps-attendance/shared';

import { AttendanceSession } from '../attendance-sessions/attendance-session.model';

// -----------------------------------------------------------------------------
// Common
// -----------------------------------------------------------------------------

export type Coefficient = number;

// -----------------------------------------------------------------------------
// Validation input
// -----------------------------------------------------------------------------

export interface LecturerLocationContext {
  latitude: number;
  longitude: number;
  accuracy: number;
  verifiedAt?: Date;
}

export interface AttendanceValidationInput {
  // Server-resolved data
  session: AttendanceSession;
  userId: number;
  existingRecordCount: number;
  checkedInAt: Date;

  // Client payload
  location: Location;
  device: Device;
  integrity: DeviceIntegrity;

  // Auxiliary context for dual-anchor validation
  lecturerLocation?: LecturerLocationContext | null;
}

// -----------------------------------------------------------------------------
// Check results
// -----------------------------------------------------------------------------

export interface IntegrityCheckResult {
  coefficient: Coefficient;
}

export interface MockLocationCheckResult {
  coefficient: Coefficient;
}

export type LocationCertainty = 'INSIDE' | 'OUTSIDE' | 'UNCERTAIN';

export interface LocationCheckResult {
  certainty: LocationCertainty;
  distance: number;
}

// -----------------------------------------------------------------------------
// Validation result
// -----------------------------------------------------------------------------

export interface AttendanceValidationResult {
  status: AttendanceValidationStatus;
  reasons: AttendanceValidationReason[];
  distance?: number;
  distanceToLecturer?: number | null;
  lecturerProximityVerdict?: 'NEAR' | 'FAR' | 'NO_DATA' | null;
}

