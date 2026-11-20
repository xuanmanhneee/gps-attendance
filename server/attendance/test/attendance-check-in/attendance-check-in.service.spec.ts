import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  AttendanceReviewErrorCode,
  AttendanceSessionErrorCode,
} from '@gps-attendance/shared';

import { AttendanceCheckInService } from '../../src/attendance-check-in/attendance-check-in.service';
import { CheckInRequestDto } from '../../src/attendance-check-in/attendance-check-in.dto';
import { InMemoryAttendanceRecordStore } from '../../src/attendance-record/infra/in-memory-attendance-record.repository';
import { AttendanceReviewService } from '../../src/attendance-review/attendance-review.service';
import { InMemoryAttendanceReviewRepository } from '../../src/attendance-review/infra/in-memory/in-memory-attendance-review.repository';
import { InMemoryAttendanceReviewHistoryRepository } from '../../src/attendance-review/infra/in-memory/in-memory-attendance-review-history.repository';

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
  let reviews: AttendanceReviewService;

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
    const recordsService = {
      getBySessionAndUser: (sessionId: number, userId: number) =>
        records.getRecord(sessionId, userId),
      markPresent: (
        input: Parameters<
          InMemoryAttendanceRecordStore['tryMarkPresentAndClaimDevice']
        >[0],
        deviceId: string,
        ttl: number,
      ) => records.tryMarkPresentAndClaimDevice(input, deviceId, ttl),
      resolveReviewRecord: (
        sessionId: number,
        userId: number,
        decision: 'approve' | 'reject',
        resolverId: number,
        candidateCreatedAt: Date,
      ) =>
        records.resolveReviewRecord(
          sessionId,
          userId,
          decision,
          resolverId,
          candidateCreatedAt,
        ),
    };
    reviews = new AttendanceReviewService(
      new InMemoryAttendanceReviewRepository(),
      new InMemoryAttendanceReviewHistoryRepository(),
      recordsService as never,
    );
    service = new AttendanceCheckInService(
      {
        findById: jest.fn().mockResolvedValue(session),
        findByIds: jest.fn().mockResolvedValue([]),
      } as never,
      { validate: jest.fn().mockReturnValue({ status: 'VALID' }) } as never,
      recordsService as never,
      reviews,
      { evaluate: jest.fn().mockResolvedValue({ isTooMany: false }) } as never,
      { findByIds: jest.fn().mockResolvedValue([]) } as never,
      {
        create: jest.fn().mockReturnValue({
          log: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
          verbose: jest.fn(),
        }),
      } as never,
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

  it('lưu REVIEW candidate riêng, giữ record absent và không giữ thiết bị', async () => {
    (service as any).attendanceValidationService.validate.mockReturnValue({
      status: 'REVIEW',
      reasons: ['LOW_CONFIDENCE_SCORE'],
    });

    await expect(
      service.checkIn(requestFor('shared-device'), 1),
    ).resolves.toEqual({
      status: 'REVIEW',
      reasons: ['LOW_CONFIDENCE_SCORE'],
    });
    expect(await records.getRecord(1, 1)).toMatchObject({
      status: 'absent',
      updateBy: null,
    });
    expect(await reviews.findBySession(1)).toEqual([
      expect.objectContaining({
        userId: 1,
        reasons: ['LOW_CONFIDENCE_SCORE'],
      }),
    ]);

    (service as any).attendanceValidationService.validate.mockReturnValue({
      status: 'VALID',
    });
    await expect(
      service.checkIn(requestFor('shared-device'), 2),
    ).resolves.toEqual({
      status: 'VALID',
    });

    await expect(service.checkIn(requestFor('device-1'), 1)).resolves.toEqual({
      status: 'VALID',
    });
    expect(await reviews.findBySession(1)).toHaveLength(0);
  });

  it('không ghi buffer khi validation trả REJECTED', async () => {
    (service as any).attendanceValidationService.validate.mockReturnValue({
      status: 'REJECTED',
      reasons: ['MOCK_LOCATION'],
    });

    await expect(service.checkIn(requestFor('device-1'), 1)).resolves.toEqual({
      status: 'REJECTED',
      reasons: ['MOCK_LOCATION'],
    });
    expect(await records.getRecord(1, 1)).toMatchObject({ status: 'absent' });
  });

  it('chỉ trả lịch sử review thuộc organizer hiện tại', async () => {
    jest.spyOn(reviews, 'findHistoryByResolver').mockResolvedValue([
      {
        id: '9',
        sessionId: 7,
        userId: 2,
        resolverId: 10,
        decision: 'approve',
        reasons: ['OUT_OF_RANGE'],
        reason: 'Đã xác minh trực tiếp',
        previousStatus: 'absent',
        resolvedStatus: 'present',
        resolvedAt: new Date('2026-11-07T10:00:00.000Z'),
      },
      {
        id: '10',
        sessionId: 8,
        userId: 2,
        resolverId: 10,
        decision: 'reject',
        reasons: ['MOCK_LOCATION'],
        previousStatus: 'absent',
        resolvedStatus: 'absent',
        resolvedAt: new Date('2026-11-07T11:00:00.000Z'),
      },
    ]);
    (service as any).attendanceSessionsService.findByIds.mockResolvedValue([
      { id: 7, title: 'Phiên của tôi', createdBy: 10 },
      { id: 8, title: 'Phiên người khác', createdBy: 11 },
    ]);
    (service as any).usersService.findByIds.mockResolvedValue([
      {
        id: 2,
        code: 'PAR0002',
        fullname: 'Trần Minh Anh',
        role: 'participant',
      },
    ]);

    await expect(service.listReviewHistory(10)).resolves.toEqual([
      {
        id: '9',
        session: { id: 7, title: 'Phiên của tôi' },
        student: {
          code: 'PAR0002',
          fullname: 'Trần Minh Anh',
          role: 'participant',
        },
        decision: 'approve',
        reasons: ['OUT_OF_RANGE'],
        reason: 'Đã xác minh trực tiếp',
        resolvedAt: '2026-11-07T10:00:00.000Z',
      },
    ]);
  });
});
