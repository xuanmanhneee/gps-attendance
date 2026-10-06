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
    gpsAccuracyThreshold: session.gpsAccuracyThreshold ?? null,
    lecturerValidationRadius: session.lecturerValidationRadius ?? null,
    buildingId: session.buildingId ?? null,
    roomId: session.roomId ?? null,
    timetableSlotId: session.timetableSlotId ?? null,
    locationSource: session.locationSource ?? 'MANUAL',
    location: {
      building: session.building ?? null,
      room: session.room ?? null,
    },
    openAt: session.openAt.toISOString(),
    closeAt: session.closeAt.toISOString(),
    status: session.status,
  };
}
