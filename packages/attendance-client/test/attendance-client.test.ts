import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type AttendanceHttpClient,
  type CheckInRequest,
  type MyAttendanceSessionResponse,
  canCheckIn,
  createAttendanceClient,
  getParticipantSessionStatus,
} from '../src/index';

test('owns session and check-in requests', async () => {
  let submitted: CheckInRequest | undefined;
  let getPath: string | undefined;
  let postPath: string | undefined;
  const httpClient: AttendanceHttpClient = {
    get: async <T>(path: string) => {
      getPath = path;
      return [] as T;
    },
    post: async <T>(path: string, body?: unknown) => {
      postPath = path;
      submitted = body as CheckInRequest;
      return { status: 'VALID' } as T;
    },
  };
  const client = createAttendanceClient(httpClient, {
    getLocation: async () => ({
      latitude: 11.94,
      longitude: 108.45,
      accuracy: 5,
      timestamp: 1,
      isMockLocation: false,
    }),
    getDevice: async () => ({
      deviceId: 'device-1',
      platform: 'android',
      model: 'test',
    }),
    getIntegrity: async ({ sessionId }) => ({
      integrityToken: `token-${sessionId}`,
    }),
  });

  await client.getSessions();
  await client.checkIn(7);

  assert.equal(getPath, '/v0/attendance-sessions/me');
  assert.equal(postPath, '/v0/attendance/check-in');
  assert.equal(submitted?.sessionId, 7);
  assert.equal(submitted?.integrity.integrityToken, 'token-7');
  assert.equal(submitted?.device.deviceId, 'device-1');
});

test('derives participant status before deciding check-in eligibility', () => {
  const session: MyAttendanceSessionResponse = {
    id: 1,
    title: 'Session',
    latitude: 11.94,
    longitude: 108.45,
    radius: 50,
    openAt: '2026-11-10T01:00:00.000Z',
    closeAt: '2026-11-10T02:00:00.000Z',
    status: 'cancelled',
    myAttendance: {
      status: 'absent',
      checkedInAt: null,
    },
  };

  const cancelledStatus = getParticipantSessionStatus(session);
  assert.equal(cancelledStatus, 'cancelled');
  assert.equal(canCheckIn(cancelledStatus), false);

  const openStatus = getParticipantSessionStatus({
    ...session,
    status: 'open',
  });
  assert.equal(openStatus, 'absent');
  assert.equal(canCheckIn(openStatus), true);
});
