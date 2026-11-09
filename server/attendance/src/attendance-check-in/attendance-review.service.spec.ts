import { AttendanceSessionQueryService } from '../attendance-sessions/attendance-session-query.service';

describe('AttendanceSessionQueryService review resolution', () => {
  it('records an approved review and its attendance history atomically', async () => {
    const attempt = {
      id: 12,
      sessionId: 3,
      userId: 7,
      result: 'REVIEW',
      serverTimestamp: new Date('2026-01-01T10:00:00.000Z'),
      deviceId: 'device-7',
      latitude: 10,
      longitude: 106,
      accuracy: 5,
      distanceToCenter: 2,
      reasons: ['DEVICE_ATTESTATION_FAILED'],
    };
    const tx = {
      attendanceAttempt: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      attendanceRecord: { upsert: jest.fn().mockResolvedValue({}) },
      attendanceHistoryEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      attendanceAttempt: { findFirst: jest.fn().mockResolvedValue(attempt) },
      $transaction: jest.fn(async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const sessions = {
      findByIdForUser: jest.fn().mockResolvedValue({ id: 3 }),
    };
    const service = new AttendanceSessionQueryService(
      sessions as never,
      {} as never,
      {} as never,
      prisma as never,
    );

    await expect(
      service.reviewAttempt(3, 12, 99, 'organizer', 'APPROVED', 'Đã xác nhận'),
    ).resolves.toBeUndefined();

    expect(sessions.findByIdForUser).toHaveBeenCalledWith(3, {
      userId: 99,
      role: 'organizer',
    });
    expect(tx.attendanceAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 12, sessionId: 3, result: 'REVIEW' },
        data: expect.objectContaining({
          result: 'APPROVED',
          reviewedBy: 99,
          reviewNote: 'Đã xác nhận',
        }),
      }),
    );
    expect(tx.attendanceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_userId: { sessionId: 3, userId: 7 } },
        create: expect.objectContaining({ status: 'present', updatedBy: 99 }),
      }),
    );
    expect(tx.attendanceHistoryEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'REVIEW_DECISION',
          status: 'present',
          attemptResult: 'APPROVED',
          reasons: ['DEVICE_ATTESTATION_FAILED'],
        }),
      }),
    );
  });
});
