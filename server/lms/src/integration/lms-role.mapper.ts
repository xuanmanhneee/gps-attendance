import type { LmsUser } from "../database/lms.repository.ts";

export type AttendanceRole = "organizer" | "participant";
export interface AttendanceUser {
  code: string;
  fullname: string;
  role: AttendanceRole;
  unitCode: string;
}

const AttendanceRoleByLmsRole: Record<
  Exclude<LmsUser["role"], "admin">,
  AttendanceRole
> = {
  lecturer: "organizer",
  student: "participant",
};

export function mapLmsUserToAttendance(user: LmsUser): AttendanceUser {
  if (user.role === "admin") {
    throw new Error("Admin LMS không thuộc contract Attendance");
  }
  return {
    code: user.code,
    fullname: user.fullname,
    role: AttendanceRoleByLmsRole[user.role],
    unitCode: user.unitCode,
  };
}
