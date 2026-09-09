import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import { AttendanceSession } from './attendance-session.model';

export function toAttendanceSessionResponse(
  session: AttendanceSession,
): AttendanceSessionResponse {
  return {
    id: session.id,
    title: session.title,
    latitude: session.latitude,
    longitude: session.longitude,
    radius: session.radius,
    openAt: session.openAt.toISOString(),
    closeAt: session.closeAt.toISOString(),
    status: session.status,
  };
}
