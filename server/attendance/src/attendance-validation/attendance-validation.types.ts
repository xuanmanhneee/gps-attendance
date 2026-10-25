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

export interface LocationTimestampCheckResult {
  isValid: boolean;
  ageMs: number;
}

// -----------------------------------------------------------------------------
// Validation result
// -----------------------------------------------------------------------------

export interface AttendanceValidationValid {
  status: 'VALID';
}

export interface AttendanceValidationReview {
  status: 'REVIEW';
  reasons: [AttendanceValidationReason, ...AttendanceValidationReason[]]; // ít nhất 1 phần tử
}

export interface AttendanceValidationRejected {
  status: 'REJECTED';
  reasons: [AttendanceValidationReason, ...AttendanceValidationReason[]];
}

export type AttendanceValidationResult =
  | AttendanceValidationValid
  | AttendanceValidationReview
  | AttendanceValidationRejected;
