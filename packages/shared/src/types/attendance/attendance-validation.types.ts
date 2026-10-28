export type AttendanceValidationReason =
  | 'LOW_CONFIDENCE_SCORE'
  | 'MOCK_LOCATION'
  | 'OUT_OF_RANGE'
  | 'INVALID_LOCATION_TIMESTAMP';

export type AttendanceValidationResult =
  | { status: 'VALID' }
  | {
      status: 'REVIEW' | 'REJECTED';
      reasons: [AttendanceValidationReason, ...AttendanceValidationReason[]];
    };
