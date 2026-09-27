export interface IAttendanceCheckInDeviceUsageRepository {
  isUsed(sessionId: number, deviceId: string, userId?: number): Promise<boolean>;
  markUsed(sessionId: number, deviceId: string): Promise<void>;
}
