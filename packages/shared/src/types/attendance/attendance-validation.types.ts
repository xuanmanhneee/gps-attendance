export type AttendanceValidationReason =
  | 'LOW_CONFIDENCE_SCORE'
  | 'LOW_LOCATION_ACCURACY'
  | 'MOCK_LOCATION'
  | 'OUT_OF_RANGE';

export type AttendanceValidationResult =
  | { status: 'VALID' }
  | {
      status: 'REVIEW' | 'REJECTED';
      reasons: [AttendanceValidationReason, ...AttendanceValidationReason[]];
    };
