import type { LmsUnit } from "../database/lms.repository.ts";

export interface AttendanceUnit {
  externalCode: string;
  name: string;
  parentCode: string | null;
}

export function mapLmsUnitToAttendance(unit: LmsUnit): AttendanceUnit {
  return {
    externalCode: unit.code,
    name: unit.name,
    parentCode: unit.parentCode,
  };
}
