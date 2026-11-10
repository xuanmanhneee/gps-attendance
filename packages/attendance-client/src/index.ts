import type {
  AttendanceStatus,
  CheckInRequest,
  CheckInResponse,
  Device,
  DeviceIntegrity,
  HttpClient,
  Location,
  MyAttendanceSessionResponse,
  SessionStatus,
} from '@gps-attendance/shared';

export type {
  AttendanceCheckInReason,
  AttendanceSessionResponse,
  AttendanceStatus,
  AttendanceValidationReason,
  AttendanceValidationStatus,
  CheckInRequest,
  CheckInResponse,
  Device,
  DeviceIntegrity,
  Location,
  MyAttendanceSessionResponse,
  SessionStatus,
} from '@gps-attendance/shared';

export type AttendanceIntegrityInput = Pick<
  CheckInRequest,
  'sessionId' | 'location' | 'device'
>;

export type AttendanceHttpClient = Pick<HttpClient, 'get' | 'post'>;

export interface AttendancePlatformAdapters {
  getLocation(): Promise<Location>;
  getDevice(): Promise<Device>;
  getIntegrity(input: AttendanceIntegrityInput): Promise<DeviceIntegrity>;
}

export interface AttendanceCheckInContext {
  location: Location;
  device: Device;
  integrity: DeviceIntegrity;
}

export interface AttendanceClient {
  collectCheckInContext(sessionId?: number): Promise<AttendanceCheckInContext>;
  buildCheckInPayload(sessionId: number): Promise<CheckInRequest>;
  getSessions(): Promise<MyAttendanceSessionResponse[]>;
  checkIn(sessionId: number): Promise<CheckInResponse>;
}

export type ParticipantSessionStatus =
  | Exclude<SessionStatus, 'open'>
  | AttendanceStatus;

export function getParticipantSessionStatus(
  session: MyAttendanceSessionResponse,
): ParticipantSessionStatus {
  return session.status === 'open'
    ? session.myAttendance.status
    : session.status;
}

export function canCheckIn(status: ParticipantSessionStatus): boolean {
  return status === 'absent';
}

export function createAttendanceClient(
  httpClient: AttendanceHttpClient,
  platform: AttendancePlatformAdapters,
): AttendanceClient {
  const collectCheckInContext = async (
    sessionId?: number,
  ): Promise<AttendanceCheckInContext> => {
    const [location, device] = await Promise.all([
      platform.getLocation(),
      platform.getDevice(),
    ]);
    return {
      location,
      device,
      integrity: sessionId === undefined
        ? { integrityToken: null }
        : await platform.getIntegrity({ sessionId, location, device }),
    };
  };

  const buildCheckInPayload = async (
    sessionId: number,
  ): Promise<CheckInRequest> => ({
    sessionId,
    ...(await collectCheckInContext(sessionId)),
  });

  return {
    collectCheckInContext,
    buildCheckInPayload,
    getSessions: () =>
      httpClient.get<MyAttendanceSessionResponse[]>(
        '/v0/attendance-sessions/me',
      ),
    checkIn: async (sessionId: number) =>
      httpClient.post<CheckInResponse>(
        '/v0/attendance/check-in',
        await buildCheckInPayload(sessionId),
      ),
  };
}
