import type { LmsSession } from "../database/lms.repository.ts";

export interface AttendanceSessionInput {
  externalId: string;
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  openAt: string;
  closeAt: string;
  organizerCode: string;
  participantCodes: string[];
}

export function mapLmsSessionToAttendance(
  session: LmsSession,
  organizerCode: string,
  participantCodes: string[],
): AttendanceSessionInput {
  return {
    externalId: session.externalId,
    title: session.title,
    latitude: session.latitude,
    longitude: session.longitude,
    radius: session.radius,
    openAt: session.openAt,
    closeAt: session.closeAt,
    organizerCode,
    participantCodes: [...participantCodes].sort(),
  };
}
