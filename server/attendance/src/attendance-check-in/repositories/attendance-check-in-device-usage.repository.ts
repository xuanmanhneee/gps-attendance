export interface IAttendanceCheckInDeviceUsageRepository {
  isUsed(sessionId: number, deviceId: string): Promise<boolean>;
  markUsed(sessionId: number, deviceId: string): Promise<void>;
}
