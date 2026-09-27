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

export interface LocationCheckResult {
  coefficient: Coefficient;
  distance: number;
}

// -----------------------------------------------------------------------------
// Validation result
// -----------------------------------------------------------------------------

export interface AttendanceValidationResult {
  status: AttendanceValidationStatus;
  reasons: AttendanceValidationReason[];
  distance?: number;
}

