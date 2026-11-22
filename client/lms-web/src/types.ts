export type Course = { id: number; code: string; name: string; lecturerCode: string };
export type Building = { id: number; code: string; name: string; latitude: number; longitude: number };
export type LmsUser = { code: string; fullname: string; role: 'admin' | 'lecturer' | 'student'; unitCode: string };
export type LmsUnit = { code: string; name: string; parentCode: string | null };
export type AttendanceOptions = { units: LmsUnit[]; students: LmsUser[] };
export type CourseDetail = { course: Course; students: LmsUser[] };
export type AttendanceSession = { externalId: string; status: string; participantCount: number; finalized: boolean };
export type CallReport = { endpoint: string; source: 'attendance' | 'mock' | string; ok: boolean; message?: string; at: string };
export type AttendanceSummary = {
  source: 'mock';
  class: { id: number; code: string; name: string };
  finalizedSessionCount: number;
  students: Array<{ code: string; fullname: string; presentCount: number; lateCount: number; absentCount: number; excusedCount: number; attendedCount: number; attendanceRate: number }>;
};
