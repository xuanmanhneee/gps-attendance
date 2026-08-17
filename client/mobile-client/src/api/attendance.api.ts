import {
    CheckInRequestPayload,
    CheckInResponsePayload,
} from '@gps-attendance/shared-types';

import { http } from './api';

const attendance = {
  checkIn(
    payload: CheckInRequestPayload,
  ): Promise<CheckInResponsePayload> {
    return http.post<CheckInResponsePayload>(
      '/attendance/check-in',
      payload,
    );
  },
};

export default attendance;