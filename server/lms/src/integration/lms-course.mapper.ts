import type { LmsClass } from "../database/lms.repository.ts";

export interface AttendanceTag {
  externalCode: string;
  name: string;
  organizerCode: string;
  participantCodes: string[];
}

export function mapLmsCourseToAttendanceTag(
  course: LmsClass,
  studentCodes: string[],
): AttendanceTag {
  return {
    externalCode: course.code,
    name: `${course.code} · ${course.name}`.slice(0, 100),
    organizerCode: course.lecturerCode,
    participantCodes: studentCodes,
  };
}
