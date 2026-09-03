export type AttendanceValidationReason =
  'LOW_CONFIDENCE_SCORE' | 'MOCK_LOCATION' | 'OUT_OF_RANGE';

export type AttendanceValidationResult =
  | { status: 'VALID' }
  | {
      status: 'REVIEW' | 'REJECTED';
      reasons: [AttendanceValidationReason, ...AttendanceValidationReason[]];
    };
