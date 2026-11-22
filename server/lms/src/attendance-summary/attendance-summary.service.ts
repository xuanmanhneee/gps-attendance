import type { CourseService } from "../courses/course.service.ts";

const MOCK_FINALIZED_SESSION_COUNT = 12;

// shortcut: generated summaries are UI fixtures, replace them with finalized Attendance records when wiring real reports.

export const AttendanceSummaryErrorCode = {
  NOT_FOUND: "LMS_ATTENDANCE_SUMMARY_NOT_FOUND",
} as const;

export interface StudentAttendanceSummary {
  code: string;
  fullname: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendedCount: number;
  attendanceRate: number;
}

export interface ClassAttendanceSummary {
  source: "mock";
  class: { id: number; code: string; name: string };
  finalizedSessionCount: number;
  students: StudentAttendanceSummary[];
}

export class AttendanceSummaryService {
  constructor(private readonly courses: CourseService) {}

  getByClassId(classId: number): ClassAttendanceSummary | null {
    const course = this.courses.find(classId);
    if (!course) return null;

    return {
      source: "mock",
      class: { id: course.id, code: course.code, name: course.name },
      finalizedSessionCount: MOCK_FINALIZED_SESSION_COUNT,
      students: this.courses.studentDetails(classId).map((student, index) => {
        const lateCount = 1 + index % 3;
        const absentCount = 1 + index % 2;
        const excusedCount = index % 2;
        const presentCount = MOCK_FINALIZED_SESSION_COUNT - lateCount -
          absentCount - excusedCount;
        const attendedCount = presentCount + lateCount;
        return {
          code: student.code,
          fullname: student.fullname,
          presentCount,
          lateCount,
          absentCount,
          excusedCount,
          attendedCount,
          attendanceRate: Math.round(
            attendedCount / MOCK_FINALIZED_SESSION_COUNT * 1000,
          ) / 10,
        };
      }),
    };
  }
}
