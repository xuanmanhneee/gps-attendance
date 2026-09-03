import { AttendanceValidationReason } from './attendance-validation.types';

export type AttendanceCheckInReason =
  'TOO_MANY_ATTEMPTS' | 'DUPLICATE_DEVICE' | AttendanceValidationReason;

export type AttendanceCheckInResult =
  | { status: 'VALID' }
  | {
      status: 'REVIEW' | 'REJECTED';
      reasons: [AttendanceCheckInReason, ...AttendanceCheckInReason[]];
    };
