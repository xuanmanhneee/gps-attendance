import { Inject, Injectable } from '@nestjs/common';

import { ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY } from '../attendance-check-in.token';
import { IAttendanceCheckInDeviceUsageRepository } from '../repositories/attendance-check-in-device-usage.repository';

@Injectable()
export class DeviceCheck {
  constructor(
    @Inject(ATTENDANCE_CHECK_IN_DEVICE_USAGE_REPOSITORY)
    private readonly deviceUsageRepository: IAttendanceCheckInDeviceUsageRepository,
  ) {}

  async evaluate(input: {
    sessionId: number;
    deviceId: string;
  }): Promise<{ isDuplicate: boolean }> {
    const isUsed = await this.deviceUsageRepository.isUsed(
      input.sessionId,
      input.deviceId,
    );

    return {
      isDuplicate: isUsed,
    };
  }
}
