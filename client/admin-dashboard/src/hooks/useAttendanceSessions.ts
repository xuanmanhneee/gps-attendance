import { useCallback, useEffect, useState } from 'react';

import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import type { CreateSessionFormData } from '../components/CreateSessionModal';

export const useAttendanceSessions = () => {
  const [sessions, setSessions] = useState<AttendanceSessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await attendanceSessionsApi.getAll();
      setSessions(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createSession = async (data: CreateSessionFormData) => {
    const created = await attendanceSessionsApi.create(data);

    console.log('[createSession] response nhận được:', created);

    if (!created || typeof created.id !== 'number') {
      throw new Error('Server không trả về dữ liệu session hợp lệ sau khi tạo');
    }

    setSessions((prev) => [created, ...prev]);
  };

  const deleteSession = async (id: number) => {
    await attendanceSessionsApi.remove(id);
    setSessions((prev) => prev.filter((session) => session.id !== id));
  };

  return {
    sessions,
    isLoading,
    createSession,
    deleteSession,
    reload: loadSessions,
  };
};
