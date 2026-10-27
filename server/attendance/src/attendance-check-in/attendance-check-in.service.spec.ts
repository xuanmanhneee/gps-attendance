import { BadRequestException, ConflictException } from '@nestjs/common';
import { AttendanceSessionErrorCode } from '@gps-attendance/shared';

import { AttendanceCheckInService } from './attendance-check-in.service';
import { CheckInRequestDto } from './attendance-check-in.dto';
import { InMemoryAttendanceRecordStore } from '../attendance-record/infra/in-memory-attendance-record.repository';

const session = {
  id: 1,
  status: 'open',
  closeAt: new Date(Date.now() + 60_000),
};

const requestFor = (deviceId: string): CheckInRequestDto => ({
  sessionId: 1,
  location: {
    latitude: 10,
    longitude: 106,
    accuracy: 10,
    timestamp: Date.now(),
    isMockLocation: false,
  },
  device: { deviceId, platform: 'android', model: 'Test device' },
  integrity: { integrityToken: null },
});

describe('AttendanceCheckInService concurrent requests', () => {
  let service: AttendanceCheckInService;
  let records: InMemoryAttendanceRecordStore;

  beforeEach(async () => {
    records = new InMemoryAttendanceRecordStore();
    for (const userId of [1, 2]) {
      await records.upsertRecord({
        sessionId: 1,
        userId,
        status: 'absent',
        checkedInAt: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        updateBy: null,
      });
    }
    service = new AttendanceCheckInService(
      { findById: jest.fn().mockResolvedValue(session) } as never,
      { validate: jest.fn().mockReturnValue({ status: 'VALID' }) } as never,
      {
        getBySessionAndUser: (sessionId: number, userId: number) =>
          records.getRecord(sessionId, userId),
        markPresent: (
          input: Parameters<
            InMemoryAttendanceRecordStore['tryMarkPresentAndClaimDevice']
          >[0],
          deviceId: string,
          ttl: number,
        ) => records.tryMarkPresentAndClaimDevice(input, deviceId, ttl),
      } as never,
      { evaluate: jest.fn().mockResolvedValue({ isTooMany: false }) } as never,
    );
  });

  it('accepts only one student when two students use the same device', async () => {
    const results = await Promise.all([
      service.checkIn(requestFor('shared-device'), 1),
      service.checkIn(requestFor('shared-device'), 2),
    ]);

    expect(results.filter((result) => result.status === 'VALID')).toHaveLength(
      1,
    );
    expect(results.filter((result) => result.status === 'REJECTED')).toEqual([
      { status: 'REJECTED', reasons: ['DUPLICATE_DEVICE'] },
    ]);
    const stored = await records.findBySession(1);
    expect(stored.filter((record) => record.status === 'present')).toHaveLength(
      1,
    );
  });

  it('does not accept two concurrent check-ins from one student', async () => {
    const results = await Promise.allSettled([
      service.checkIn(requestFor('device-1'), 1),
      service.checkIn(requestFor('device-1'), 1),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const failed = results.find((result) => result.status === 'rejected');
    expect(failed).toMatchObject({ reason: expect.any(ConflictException) });
    expect((await records.getRecord(1, 1))?.status).toBe('present');
  });

  it('rejects a check-in that reaches the commit step after flush starts', async () => {
    await records.beginSessionFlush(1);

    await expect(
      service.checkIn(requestFor('device-1'), 1),
    ).rejects.toMatchObject({
      response: {
        code: AttendanceSessionErrorCode.INVALID_TIME_RANGE,
      },
      constructor: BadRequestException,
    });

    expect((await records.getRecord(1, 1))?.status).toBe('absent');
  });
});
