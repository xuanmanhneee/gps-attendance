import { useCallback, useEffect, useState } from 'react';
import type {
  Device,
  DeviceIntegrity,
  Location,
} from '@gps-attendance/attendance-client';
import { attendanceApi } from '../api/attendance.api';
import { resetDeviceId } from '../services/device-id';

type State = {
  location: Location | null;
  device: Device | null;
  integrity: DeviceIntegrity | null;
  error: string | null;
};

const EMPTY: State = {
  location: null,
  device: null,
  integrity: null,
  error: null,
};

export function useCheckInContext() {
  const [state, setState] = useState<State>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      setState({
        ...(await attendanceApi.collectCheckInContext()),
        error: null,
      });
    } catch (e) {
      setState({
        ...EMPTY,
        error: e instanceof Error ? e.message : 'Không lấy được dữ liệu',
      });
    }
  }, []);

  const reset = useCallback(async () => {
    await resetDeviceId();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh, reset };
}

// Export để component hiển thị (debug-device-card) nhận dữ liệu qua prop thay
// vì tự gọi hook — nhờ đó màn hình cha điều khiển được refresh/reset.
export type CheckInContext = ReturnType<typeof useCheckInContext>;
