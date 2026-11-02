import type {
  AttendanceParticipantResponse,
  AttendanceStatus,
} from '@gps-attendance/shared';

export type AttendanceRecordStatusFilter = 'all' | AttendanceStatus;

export interface AttendanceRecordSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export const summarizeAttendanceRecords = (
  participants: AttendanceParticipantResponse[],
): AttendanceRecordSummary =>
  participants.reduce<AttendanceRecordSummary>(
    (summary, participant) => ({
      ...summary,
      total: summary.total + 1,
      [participant.status]: summary[participant.status] + 1,
    }),
    { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
  );

export const filterAttendanceRecords = (
  participants: AttendanceParticipantResponse[],
  query: string,
  status: AttendanceRecordStatusFilter,
): AttendanceParticipantResponse[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return participants.filter((participant) => {
    if (status !== 'all' && participant.status !== status) return false;
    if (!normalizedQuery) return true;

    return [participant.user.code, participant.user.fullname].some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    );
  });
};
