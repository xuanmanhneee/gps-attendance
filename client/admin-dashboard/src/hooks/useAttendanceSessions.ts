import { useCallback, useEffect, useState } from 'react';

import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import type { CreateSessionFormData } from '../types/attendance-session';

export const useAttendanceSessions = () => {
  const [sessions, setSessions] = useState<AttendanceSessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(
    () => attendanceSessionsApi.getAll(),
    [],
  );

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSessions]);

  useEffect(() => {
    const initializeSessions = async () => {
      try {
        const data = await fetchSessions();
        setSessions(data);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeSessions();
  }, [fetchSessions]);

  const createSession = async (data: CreateSessionFormData) => {
    const created = await attendanceSessionsApi.create(data);

    if (!created || typeof created.id !== 'number') {
      throw new Error('Server không trả về dữ liệu session hợp lệ sau khi tạo');
    }

    setSessions((prev) => [created, ...prev]);
  };

  return { sessions, isLoading, createSession, reload: loadSessions };
};
