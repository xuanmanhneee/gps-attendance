import { AttendanceCheckInService } from '../../src/attendance-check-in/attendance-check-in.service';

describe('AttendanceCheckInService review resolution audit', () => {
  it('giữ quyết định thành công khi ghi audit lỗi và log đủ entry', async () => {
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
    const audit = { record: jest.fn().mockRejectedValue(new Error('db down')) };
    const now = Date.now();
    const service = new AttendanceCheckInService(
      {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          createdBy: 99,
          status: 'open',
          openAt: new Date(now - 60_000),
          closeAt: new Date(now + 60_000),
        }),
      } as never,
      {} as never,
      {
        resolveReview: jest.fn().mockResolvedValue({
          status: 'resolved',
          previousStatus: 'absent',
          record: {
            sessionId: 1,
            userId: 2,
            status: 'present',
            updateBy: 99,
          },
          candidate: {
            sessionId: 1,
            userId: 2,
            reasons: ['LOW_CONFIDENCE_SCORE'],
            createdAt: new Date(now),
          },
        }),
      } as never,
      {} as never,
      {} as never,
      audit as never,
      { create: () => logger } as never,
    );

    await expect(
      service.resolveReview(1, 2, 'approve', 99, 'Đã xác nhận'),
    ).resolves.toBeUndefined();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: '1:2',
        oldValue: { status: 'absent' },
        newValue: { status: 'present' },
        metadata: {
          reasons: ['LOW_CONFIDENCE_SCORE'],
        },
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('"entityId":"1:2"'),
      expect.any(String),
    );
  });
});
