import { createAttendanceClient } from '@gps-attendance/attendance-client';

import { buildDeviceInfo } from '../services/device-info';
import { isMockLocationForced } from '../services/dev-mode';
import { getIntegrity } from '../services/integrity';
import { getCurrentLocation } from '../services/location';
import { httpClient } from './http';

export const attendanceApi = createAttendanceClient(httpClient, {
  getLocation: async () => {
    const location = await getCurrentLocation();
    return isMockLocationForced()
      ? { ...location, isMockLocation: true }
      : location;
  },
  getDevice: buildDeviceInfo,
  getIntegrity,
});
