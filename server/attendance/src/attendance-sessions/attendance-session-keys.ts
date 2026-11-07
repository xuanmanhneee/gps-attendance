export const criteriaKeyFor = (sessionId: number) =>
  `attendance:session:${sessionId}:criteria`;

export const rosterInitializedKeyFor = (sessionId: number) =>
  `attendance:session:${sessionId}:roster-initialized`;
